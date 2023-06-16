import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/RFO.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [typescript({
    allowSyntheticDefaultImports: true,
    declaration: true,
    outDir: 'dist',
    rootDir: 'src',
    lib: [
      "es2015",
      "es2016",
      "es2017",
      "es2018",
      "es2019",
    ],
    target: "ES6"
  })],
};
