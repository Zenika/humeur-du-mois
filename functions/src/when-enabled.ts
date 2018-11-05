import { Feature, isEnabled } from "./config";

type Consumer<Args extends any[]> = (...args: Args) => void;

/**
 * Shortcuts a function based on a feature flag.
 *
 * @param feature
 * @param fn
 */
export const whenEnabled = <Args extends any[]>(
  feature: Feature,
  fn: Consumer<Args>
): Consumer<Args> => {
  return (...args: Args) => {
    if (!isEnabled(feature)) {
      console.info("feature disabled; aborting");
      return;
    }
    return fn(...args);
  };
};
