import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import type { To } from "../../policy.ts";
import { Worker } from "../worker/worker.ts";
import type { Namespace, NamespaceProps } from "./namespace.ts";

export interface Bind<B = Namespace<unknown>>
  extends Capability<"Cloudflare.DurableObject.Namespace.Bind", B> {}

export const Bind = Binding<
  <B extends Namespace<unknown>>(
    namespace: B,
  ) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.DurableObject.Namespace.Bind");

export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          type: "durable_object_namespace",
          name: source.id,
          class_name: source.props.className,
          script_name: source.props.scriptName,
          environment: source.props.environment,
          namespace_id: source.props.namespaceId,
        },
      ],
    }),
  });
