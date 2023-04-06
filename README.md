# typescript-interface-extractor

[![npm version](https://badge.fury.io/js/typescript-interface-extractor.svg)](https://badge.fury.io/js/typescript-interface-extractor)

`typescript-interface-extractor` is a CLI tool for extracting interfaces, enums, type aliases, and function definitions into a single `.d.ts` file from any TypeScript source file. Classes and constants will be replaced with type `any`. This is useful for creating a small `@types` library from a TypeScript API library whose size is large. The extracted `.d.ts` file is self-contained, meaning there are no references to any other TypeScript files, and it should be ignored during compilation.

## Installation

You can install `typescript-interface-extractor` globally using `npm`:

```
npm install -g typescript-interface-extractor
```

Or you can install it as a development dependency in your project:

```
npm install --save-dev typescript-interface-extractor
```

## Usage

The `typescript-interface-extractor` command-line tool can be used as follows:

```
ts-interface-extract --file=<ts file path> --entry=<entry point (namespace or interface)> [--output=<output directory>]
```


- `--file` (`-f`): Path to the TypeScript file to extract from
- `--entry` (`-e`): Name of the namespace or interface to extract
- `--output` (`-o`): Optional output directory for the extracted `.d.ts` file. Defaults to the `./output` folder in current directory.

Here's an example of how to use `typescript-interface-extractor` on dv360 googleapi:

```
ts-interface-extract --file=./node_modules/googleapis/build/src/apis/displayvideo/v1.d.ts --entry=displayvideo_v1
```


This will extract the namespace named `displayvideo_v1` from the file `./node_modules/googleapis/build/src/apis/displayvideo/v1.d.ts` and save it as a self-contained `displayvideo_v1.d.ts` file in the `./output` directory.

## License

`typescript-interface-extractor` is licensed under the MIT license. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! See the [CONTRIBUTING](CONTRIBUTING.md) file for more information.
