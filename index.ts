import * as ts from 'typescript';
import * as fs from 'fs';
import * as minimist from 'minimist';

import { doubleclickbidmanager_v1_1} from 'googleapis';

const args = minimist(process.argv);

let fileName = args.file;
let entryPoint = args.entry;

// fileName = 'node_modules/googleapis/build/src/apis/displayvideo/v1.d.ts';
// entryPoint = 'displayvideo_v1';

fileName = 'node_modules/googleapis/build/src/apis/doubleclickbidmanager/v1.1.d.ts';
entryPoint = 'doubleclickbidmanager_v1_1';

// fileName = 'samples/sample.ts';
// entryPoint = 'IntStudent';

if (!fileName || !entryPoint) {
  console.log('ts-interface-extract --file=<ts file path> --entry=<entry point (namespace or interface)>');
  process.exit();
}

const IGNORED_TYPE_REFERENCES = ['Array'];

  // Load the library as a program
const program = ts.createProgram([fileName], {});
const sourceFile = program.getSourceFile(fileName);
const checker = program.getTypeChecker();

const builtInTypeString: IntExtracted = { name: 'string' };
const builtInTypeNumber: IntExtracted = { name: 'number' };
const builtInTypeBoolean: IntExtracted = { name: 'boolean' };
const builtInTypeAny: IntExtracted = { name: 'any' };
const builtInTypeUnion: IntExtracted = { name: 'union' };

interface IntExtracted {
  name?: string;
  type?: IntExtracted;
  parents?: string[];
  isOptional?: boolean;
  isProperty?: boolean;
  jsDoc?: string;
  value?: any;
  children?: IntExtracted[];
}

const importSpecifiers: {[index: string]: ts.Node} = {};
// To convert ts.Node to ts.Type, call checker.getTypeAtLocation(node);

const rootInterface: IntExtracted = {
  name: entryPoint,
  type: null,
  children: []
};

const allTypeDefinitions: IntExtracted[] = [];
let currentKey = entryPoint;
let containersStack: IntExtracted[] = [];
let entryPointIsNameSpace: boolean = false;

function extractInterfaces(node: ts.Node) {
  let currentContainer: IntExtracted = null;
  
  if (node['name']?.text === entryPoint) {
    console.log('=== Found Entry Point ===');
    currentContainer = rootInterface;
    if (ts.isModuleDeclaration(node)) {
      entryPointIsNameSpace = true;
      currentContainer.type = {
        name: 'namespace'
      };
      allTypeDefinitions.push(currentContainer);
      containersStack.push(currentContainer);
    } else {
      entryPointIsNameSpace = false;
    }
  }

  currentContainer = containersStack[containersStack.length - 1];
  if (ts.isModuleDeclaration(node) && node['name'].text === entryPoint) {
    ts.forEachChild(node, (childNode) => extractInterfaces(childNode));
  } else if (ts.isImportSpecifier(node)) {
    importSpecifiers[node.name.text] = node;
  } else if (ts.isInterfaceDeclaration(node)) {
    console.log("\n"+`Interface: ${node.name.text}`);
    currentKey = node.name.text;
    const parents: string[] = [];
    let definition = allTypeDefinitions.find(item => item.name === currentKey);
    if (!definition) {
      if (node.heritageClauses?.length > 0) {
        node.heritageClauses[0].types.forEach(t => {
          const parentLoadedType = checker.getTypeAtLocation(t.expression);
          const parentName = parentLoadedType.symbol.name;
          parents.push(parentName);
        });
      }
      definition = {
        name: currentKey,
        type: { name: 'interface'},
        children: []
      };
      if (parents.length > 0) {
        definition.parents = parents;
      }
      allTypeDefinitions.push(definition);
      addChild(definition);
      containersStack.push(definition);
      ts.forEachChild(node, (childNode) => extractInterfaces(childNode));
      containersStack.pop();

      if (node.heritageClauses?.length > 0) {
        node.heritageClauses[0].types.forEach(t => {
          const parentLoadedType = checker.getTypeAtLocation(t.expression);
          const parentName = parentLoadedType.symbol.name;
          const definition: IntExtracted = {
            name: parentName,
            type: { name: 'parent' }
          };
          const declarationNode = parentLoadedType.symbol?.declarations[0];
          if (declarationNode && !ts.isClassDeclaration(declarationNode)) {
            definition.children = [];
            addChild(definition);
            containersStack.push(definition);
            extractInterfaces(declarationNode);
            containersStack.pop();
          }
        });
      }
    }
  } else if (ts.isEnumDeclaration(node)) {
    const definition: IntExtracted = {
      name: node.name.text,
      type: { name: 'enum', children: [] }
    };
    node.members.forEach(item => {
      definition.type.children.push({
        name: item.name.getText(),
        value: item.initializer?.getText()
      })
    });
    if (!allTypeDefinitions.find(d => d.name === definition.name)) {
      allTypeDefinitions.push(definition);
    }
  } else if (ts.isTypeAliasDeclaration(node)) {
    const definition: IntExtracted = {
      name: node.name.text,
      type: { name: 'alias', type: { name: 'alias-type' } }
    };
    allTypeDefinitions.push(definition);
    containersStack.push(definition.type);
    extractInterfaces(node.type);
    containersStack.pop();
  } else if (ts.isPropertySignature(node)) {
    const loadedType = checker.getTypeAtLocation(node.type);
    const isOptional = checker.isOptionalParameter(node as any);
    const jsDocNode = (node.parent as any).jsDoc
    // const jsComment = jsDocNode && jsDocNode[0]?.getText();
    const jsComment = jsDocNode && jsDocNode[0].comment;   // this is the text without comment tag (/*)

    const text = (node.name as any).text;
    console.log(`  Property: ${text}`);

    const propertyDefinition: IntExtracted = {
      name: text,
      isProperty: true,
      isOptional,
      jsDoc: jsComment,
      type: { name: null }
    };
    addChild(propertyDefinition);
    containersStack.push(propertyDefinition);
    extractInterfaces(node.type);
    containersStack.pop();

  } else if (ts.isTypeNode(node)) {
    let text: string = null;
    let type: ts.Node = node;
    const loadedType = checker.getTypeAtLocation(node);

    if (ts.isLiteralTypeNode(type)) {
      const literalText = type.literal.getText();
      console.log(`      -> literal (${literalText})`);
      currentContainer.type = {
        name: literalText,
        type: {name: literalText}
      };
    } else if (type.kind === ts.SyntaxKind.StringKeyword) {
      console.log(`      -> string`);
      currentContainer.type = {
        name: 'string',
        type: builtInTypeString
      };
    } else if (type.kind === ts.SyntaxKind.NumberKeyword) {
      console.log(`      -> number`);
      currentContainer.type = {
        name: 'number',
        type: builtInTypeNumber
      };
    } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
      console.log(`      -> boolean`);
      currentContainer.type = {
        name: 'boolean',
        type: builtInTypeBoolean
      };
    } else if (ts.isArrayTypeNode(node)) {
      console.log('--- is array ---');
      currentContainer.type = {
        name: 'array',
        type: null
      };
      containersStack.push(currentContainer.type);
      extractInterfaces(node.elementType);
      containersStack.pop();
    } else if (type.kind === ts.SyntaxKind.TypeReference) {
      const key = type['typeName'].text;
      const declarationNode = loadedType.symbol?.declarations[0] || loadedType.aliasSymbol?.declarations[0];
      if (IGNORED_TYPE_REFERENCES.indexOf(key) > -1 || !declarationNode || ts.isClassDeclaration(declarationNode) || ts.isFunctionTypeNode(declarationNode)) {
        console.log(`      -> ignore reference from ${key}, replace it with any`);
        currentContainer.type = {
          name: 'any',
          type: builtInTypeAny
        };
        return;
      }

      console.log(`      -> ${key}`);
      const definition: IntExtracted = {
        name: key,
        type: { name: key }
      };
      definition.children = [];

      if (!currentContainer) {
        console.error(`Error processing: ${entryPoint} is not found!`);
        process.exit();
      }
      currentContainer.type = definition;
      containersStack.push(definition);
      extractInterfaces(declarationNode);
      containersStack.pop();

    } else if (type.kind === ts.SyntaxKind.UnionType) {
      console.log('      -> Union');
      const typeDefinition = {
        name: 'union',
        type: builtInTypeUnion,
        children: []
      }
      currentContainer.type = typeDefinition;
      containersStack.push(typeDefinition);
      (type as any).types.forEach(node => {
        const subType: IntExtracted = { name: null, type: {} };
        typeDefinition.children.push(subType);
        containersStack.push(subType.type);
        extractInterfaces(node);
        containersStack.pop();
      })
      containersStack.pop();
      // ts.forEachChild(node.type.types, (childNode) => extractInterfaces(childNode));
    }
  } else {
    ts.forEachChild(node, (childNode) => extractInterfaces(childNode));
    // console.log(`Found ${node['name'].text}`);
  }
}

function testTsCompiler() {
  // Extract interfaces from the source file and its children
  if (sourceFile) {
    ts.forEachChild(sourceFile, (node) =>
      extractInterfaces(node),
    );
  }
}

function addChild(definition: IntExtracted) {
  const currentContainer = containersStack[containersStack.length - 1];
  if (!currentContainer) return;

  if (!currentContainer.children) {
    currentContainer.children = [];
  }
  currentContainer.children.push(definition);
}

let result = '';

function writeItem(item: IntExtracted) {
  let whiteSpace = entryPointIsNameSpace ? '    ' : '';
  if (item.name === entryPoint && entryPointIsNameSpace) {
    result += `export declare namespace ${item.name} {` + "\n";
    if (item.children) {
      item.children.forEach(child => writeItem(child));
    }
    result += "\n" + `}` + "\n\n";
    whiteSpace = '';
  } else if (item.type?.name === 'interface') {
    const inheritance = item.parents?.length > 0 ? ' extends ' + item.parents.join(', ') : '';
    result += `${whiteSpace}export interface ${item.name}${inheritance} {` + "\n\n";
    if (item.children) {
      item.children.forEach(child => writeItem(child));
    }
    result += `${whiteSpace}}` + "\n\n";
  } else if (item.type?.name === 'enum') {
    result += `${whiteSpace}export enum ${item.name} {\n\n`;
    item.type.children.forEach(child => {
      result += `${whiteSpace}    ${child.name}`;
      if (child.value) {
        result += ` = ${child.value},` + "\n";
      } else {
        result += ",\n";
      }
    });
    result += "\n}\n\n";
  } else if (item.type.name === 'alias') {
    result += `${whiteSpace}export type ${item.name} = `
    if (item.type.type) {
      writeItem(item.type.type);
    }
    result += ";\n";
  } else if (item.isProperty) {
    const whiteSpace = entryPointIsNameSpace ? '        ' : '    ';
    const key = item.name.match(/^\w+$/) ? item.name : `'${item.name}'`;
    let typeName = item.type.name;
    if (typeName === 'union') {
      typeName = item.type.children?.length > 0 ? item.type.children.map(t => getNameFromNestedType(t)).filter(n => !!n).join(' | ') : 'any';
    } else if (typeName === 'array') {
      typeName = getNameFromNestedType(item.type);
    }
    if (item.jsDoc) {
      result += `${whiteSpace}/**\n`;
      result += `${whiteSpace}* ${item.jsDoc}\n`;
      result += `${whiteSpace}*/\n`;
      // result += item.jsDoc.replace(/^|\n/g, "\n" + whiteSpace) + "\n";
    }
    result += `${whiteSpace}${key}${item.isOptional ? '?' : ''}: ${typeName || 'any'};` + "\n\n";
  } else if (item.name === 'union') {
    result += item.children?.length > 0 ? item.children.map(t => getNameFromNestedType(t)).filter(n => !!n).join(' | ') : 'any';
  }
}

function getNameFromNestedType(item: IntExtracted) {
  let name = item.name || '';
  let arrayMode: boolean = false;
  if (item.name === 'array') {
    arrayMode = true;
    name = '[]';
  }
  while (item = item.type) {
    if (!item.name) continue;
    if (item.name === 'array') {
      arrayMode = true;
      name = name + '[]';
    } else if (arrayMode) {
      arrayMode = false;
      name = item.name + name;
      return name;  // --- final array formed
    } else {
      name = item.name;
    }
  }
  return name;
}

function writeFile() {
  allTypeDefinitions.forEach(item => {
    writeItem(item);
  })
  fs.writeFileSync(`./dist/${entryPoint}.d.ts`, result);
  // fs.writeFileSync(`result.json`, JSON.stringify(allTypeDefinitions, null, 2));
}

async function bootstrap() {
  testTsCompiler();
  writeFile();
}
bootstrap();
