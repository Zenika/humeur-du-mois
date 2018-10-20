declare module "firebase-tools" {
  export namespace firestore {
    // inferred from https://github.com/firebase/firebase-tools/blob/v5.1.1/commands/firestore-delete.js#L72
    function _delete(
      path: string,
      options?: DeleteOptionsWhenPathProvided
    ): Promise<void>;

    function _delete(
      path: undefined,
      options: { allCollections: true } & DeleteOptionsWhenPathProvided
    ): Promise<void>;

    type DeleteOptionsWhenPathProvided = {
      project: string;
      allCollections?: false; // makes no sense to have this be true if a path is provided
      recursive?: boolean;
      shallow?: boolean;
      yes: true; // makes no sense to have this not be true when calling from code (i.e. not from the CLI)
    };

    export { _delete as delete };
  }
}
