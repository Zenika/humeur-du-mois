declare module "firebase-tools" {
  export namespace firestore {
    // types inferred from https://github.com/firebase/firebase-tools/blob/v5.1.1/commands/firestore-delete.js#L72

    // overload that deletes only one collection
    function _delete(path: string, options?: DeleteOptions): Promise<void>;

    // overload that deletes all collections
    function _delete(
      path: undefined,
      options: { allCollections: true } & DeleteOptions
    ): Promise<void>;

    type DeleteOptions = {
      project: string;
      allCollections?: false; // makes no sense to have this be true if a path is provided
      recursive?: boolean;
      shallow?: boolean;
      yes: true; // makes no sense to have this not be true when calling from code (i.e. not from the CLI)
    };

    // this is required because TypeScript type declarations do not support
    // keywords as function names
    export { _delete as delete };
  }
}
