
/**
 * @runninghare
 * @license MIT
 * @version 0.0.1
 * 
 * @description
 * This is a simple TypeScript compiler that compiles a single file from a single entry point
 * which is either an interface or namespace.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as minimist from 'minimist';
import { TsNodeAnalyzer } from './src/classes/analyze-ts-node.class';

const args = minimist(process.argv);

const fileName = args.file;
const entryPoint = args.entry;
const outputDir = args.output || './output';

if (!fileName || !entryPoint) {
  console.log('ts-interface-extract --file=<ts file path> --entry=<entry point (namespace or interface)> [--output=<output directory>]');
  process.exit();
}

if (!fs.existsSync(outputDir)){
  fs.mkdirSync(outputDir);
}

// Load the library as a program
const program = ts.createProgram([fileName], {});
const sourceFile = program.getSourceFile(fileName);

if (!sourceFile) {
  console.log(`Source file ${fileName} not found or cannot be opened!`);
  process.exit();
}

const analyzer = new TsNodeAnalyzer(program, sourceFile, entryPoint);

if (sourceFile) {
  ts.forEachChild(sourceFile, (node) => {
    if (!analyzer.rootFound) {
      analyzer.analyzeNode(node);
    }
  });

  const result = analyzer.outputStrings.join("\n\n");
  fs.writeFileSync(`${outputDir}/${entryPoint}.d.ts`, result);
}
