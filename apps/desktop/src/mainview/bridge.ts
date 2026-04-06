import Electrobun, { Electroview } from "electrobun/view";
import type { ColdUSBRPC } from "../shared/rpc";

const rpc = Electroview.defineRPC<ColdUSBRPC>({
  maxRequestTime: 30000,
  handlers: {
    requests: {},
    messages: {},
  },
});

const electrobun = new Electrobun.Electroview({ rpc });

export { rpc, electrobun };
