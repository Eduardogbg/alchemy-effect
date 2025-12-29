import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import type { To } from "../../policy.ts";
import { Worker } from "../worker/worker.ts";
import type { Store, StoreProps } from "./store.ts";

export interface Bind<B = Store<string, StoreProps>>
  extends Capability<"Cloudflare.SecretsStore.Bind", B> {}

export const Bind = Binding<
  <B extends Store<string, StoreProps>>(store: B) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.SecretsStore.Bind");

export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          type: "secrets_store",
          name: source.id,
          store_id: source.attr.storeId,
        },
      ],
    }),
  });
