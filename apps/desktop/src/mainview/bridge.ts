import { Electroview } from "electrobun/view";
import type { ColdUSBRPC } from "../shared/rpc";

const rpc = Electroview.defineRPC<ColdUSBRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});

export { rpc };
