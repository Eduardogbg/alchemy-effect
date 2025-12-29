export type NamespaceProps = {
  className: string;
  scriptName?: string;
  environment?: string;
  sqlite?: boolean;
  namespaceId?: string;
};

/**
 * A Durable Object namespace binding.
 *
 * This is a "virtual resource" - it doesn't have API CRUD operations.
 * The namespace lifecycle is managed via Worker deployment.
 * The `props` property contains the configuration for binding resolution.
 */
export type Namespace<T = unknown> = {
  type: "durable_object_namespace";
  id: string;
  /**
   * The props are exposed for the binding system.
   * At runtime, `source.props` will contain these values.
   */
  props: NamespaceProps;
  __service__: T;
};

export function Namespace<T = unknown>(
  id: string,
  props: NamespaceProps,
): Namespace<T> {
  return {
    type: "durable_object_namespace",
    id,
    props,
    __service__: undefined!,
  };
}

export function isNamespace(binding: unknown): binding is Namespace {
  return (
    typeof binding === "object" &&
    binding !== null &&
    "type" in binding &&
    binding.type === "durable_object_namespace"
  );
}
