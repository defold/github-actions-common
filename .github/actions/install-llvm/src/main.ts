// Modified from upstream KyleMayes/install-llvm-action: ported to ESM (NodeNext
// relative import extension). See ../NOTICE.
import * as core from "@actions/core";

import { getOptions, run } from "./index.js";

async function main() {
  try {
    await run(getOptions());
  } catch (error: any) {
    console.error(error.stack);
    core.setFailed(error.message);
  }
}

main();
