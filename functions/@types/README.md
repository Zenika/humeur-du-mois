This the folder where we put custom type declaration files for libraries that don't come with one.

File structure must be the same as in `node_modules`:
- folders in this folder must be named with the name of the library (if the library is scoped then there must be a folder tree that matches the scope, e.g. `@google/firebase` gives a `@google` folder with a `firebase` folder inside)
- each library folder must contain a file named `index.d.ts` with the root declaration file

Please document how the types were determined. There is no need to type more than we need.
