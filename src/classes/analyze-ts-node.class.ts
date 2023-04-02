import * as ts from 'typescript';
import { IntExtractedNode } from "../interfaces/extracted.interface";

const IGNORED_INTERFACE_NAME = ['Array', 'ConcatArray', 'Console'];

export class TsNodeAnalyzer {

    public program: ts.Program;
    public sourceFile: ts.SourceFile;
    public entryPoint: string;
    public outputStrings: string[] = [];
    public rootFound: boolean = false;

    private checker: ts.TypeChecker;
    private processedNodes: ts.Node[] = [];
    private processedNodeStrings: string[] = [];
    private indent: string = '';

    constructor(program: ts.Program, sourceFile: ts.SourceFile, entryPoint: string) {
        this.program = program;
        this.sourceFile = sourceFile;
        this.checker = program.getTypeChecker();
        this.entryPoint = entryPoint;
        this.clear();
    }

    clear() {
        this.processedNodes = [];
        this.processedNodeStrings = [];
        this.outputStrings = [];
    }

    analyzeNode(node: ts.Node) {
        if (this.processedNodes.includes(node)) {
            return;
        }

        if (!this.rootFound) {
            if (node['name']?.text === this.entryPoint) {
                console.log('=== Found Entry Point ===');
                this.rootFound = true;

                const rootContainer = {
                    name: this.entryPoint,
                    type: null,
                    children: []
                };

                if (ts.isModuleDeclaration(node)) {
                    rootContainer.type = { name: 'namespace' };
                } else {
                    rootContainer.type = { name: 'interface' };
                }
            } else {
                return;
            }
        }

        // console.log(`===> node: ${(node as any).getText()}`);

        this.processedNodes.push(node);

        /**
         * All following will only be executed if rootContainer has been found
         */
        // const currentContainer = this.containerStack[this.containerStack.length - 1];
        if (ts.isModuleDeclaration(node)) {
            this.analyzeModuleNode(node);
        } else if (ts.isInterfaceDeclaration(node)) {
            this.analyzeInterfaceNode(node);
        } else if (ts.isEnumDeclaration(node)) {
            this.analyzeEnumNode(node);
        } else if (ts.isTypeAliasDeclaration(node)) {
            this.analyzeTypeAliasNode(node);
        } else if (ts.isPropertySignature(node)) {
            this.analyzePropertySignature(node);
        } else if (ts.isTypeNode(node)) {
            this.analyzeTypeNode(node);
        } else if (ts.isHeritageClause(node)) {
            this.analyzeHeritageClause(node);
        } else {
            this.analyzeOtherNode(node)
        }
        // if (node['type']) {
        //     this.analyzeNode(node['type']);
        // }
    }

    private analyzeModuleNode(node: ts.Node) {
        // this.putOutputStrings(node);
        this.outputStrings.push(`export declare namespace ${(node as any).name.text} {`);
        this.indent = '    ';
        for (const symbol of (node as any).locals.values()) {
            symbol.declarations.forEach((declaration: ts.Node) => {
                this.analyzeNode(declaration);
            });
        }
        this.indent = ''
        this.outputStrings.push(`\n}`);
    }

    private analyzeInterfaceNode(node: ts.Node) {
        if (!IGNORED_INTERFACE_NAME.includes(node['name'].text)) {
            this.processedNodeStrings.push(node['name'].text);
            this.putOutputStrings(node);
            this.scanChildren(node);
        }
    }

    private analyzeTypeAliasNode(node: ts.Node) {
        this.putOutputStrings(node);
        this.scanChildren(node);
    }

    private analyzeTypeNode(node: ts.Node) {
        // this.showText(node);
        if (ts.isTypeReferenceNode(node)) {
            this.analyzeTypeReference(node);
        }
        this.scanChildren(node)
    }

    private analyzeEnumNode(node: ts.Node) {
        this.putOutputStrings(node, 'export ');
        this.scanChildren(node)
    }

    private analyzeFunctionNode(node: ts.Node) {
        this.putOutputStrings(node);
    }

    private analyzePropertySignature(node: ts.Node) {
        this.scanChildren(node);
    }

    private analyzeTypeReference(node: ts.Node) {
        // this.showText(node);
        const loadedType = this.checker.getTypeAtLocation(node);
        const declarationNode = loadedType.symbol?.declarations[0] || loadedType.aliasSymbol?.declarations[0];
        if (declarationNode) {
            if (declarationNode.getText().match(/GaxiosPromise/)) {
                console.log('--- Promise ---');
            }
            if (ts.isFunctionTypeNode(declarationNode)) {
                let typeName = node['typeName']?.text;
                if (!this.processedNodeStrings.includes(typeName)) {
                    const matchedGenericTypes = declarationNode.getText().match(/<(\w+)>/g);
                    if (matchedGenericTypes?.length > 0) {
                        let generics = matchedGenericTypes.map(g => g.replace(/[<>]/g, ''));

                        // make element of generics unique
                        generics = generics.filter((g, i) => generics.indexOf(g) === i);
                        typeName += `<${generics.join(', ')}>`;
                    }
                    this.outputStrings.push(`type ${typeName} = ${declarationNode.getText()};`);
                    this.processedNodeStrings.push(node['typeName']?.text);
                }
            } else {
                this.analyzeNode(declarationNode);
            }
        }
        if (node['typeArguments']?.length > 0) {
            // console.log('--- type arguments ---');
            // node['typeArguments']?.forEach(argNode => {
            //     const type = this.checker.getTypeAtLocation(argNode);
            //     const typeSymbol = type?.getSymbol();
            //     const typeName = typeSymbol?.getName();
            //     const declaration = typeSymbol?.getDeclarations()[0];
            //     if (declaration) {
            //         console.log(`type: ${typeName}`);
            //     }
            // })
        }

        this.scanChildren(node);
    }

    private analyzeHeritageClause(node: ts.Node) {
        console.log(node);
        (node as any).types.forEach(t => {
            const parentLoadedType= this.checker.getTypeAtLocation(t.expression);
            parentLoadedType.symbol.declarations.forEach(declarationNode => {
                this.analyzeNode(declarationNode);
            })
        });
    }

    private analyzeOtherNode(node: ts.Node) {
        if (ts.isClassDeclaration(node)) {
            this.outputStrings.push(`type ${node['name'].text} = any;`);
        }
    }

    private scanChildren(node: ts.Node) {
        ts.forEachChild(node, (childNode) => {
            this.analyzeNode(childNode);
            const loadedType = this.checker.getTypeAtLocation(childNode);
            if (loadedType.symbol?.declarations?.length || loadedType.aliasSymbol?.declarations.length) {
                const declarationNode = loadedType.symbol?.declarations[0] || loadedType.aliasSymbol?.declarations[0];
                if (declarationNode) {
                    this.analyzeNode(declarationNode);
                }
            }
        });
    }

    private putOutputStrings(node: ts.Node, prefix: string = '') {
        let output = '';
        const jsDocNodes = (node as any).jsDoc;
        const jsComment = jsDocNodes && jsDocNodes[0].getText();   // this is the text without comment tag (/*)
        if (jsComment) {
            output += jsComment
        }
        output += prefix + node.getText();
        output = output.replace(new RegExp("\n", "g"), "\n" + this.indent);
        output = this.indent + output;
        this.outputStrings.push(output);
    }
}