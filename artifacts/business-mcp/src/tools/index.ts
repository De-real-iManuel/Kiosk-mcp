export const BASE_TOOLS = [
  "get_business_info",
  "get_services",
  "get_hours",
  "get_contact",
  "get_capabilities",
] as const;

export const OPTIONAL_TOOLS: Array<{
  name: string;
  requiredCapability: string;
}> = [
  { name: "get_products", requiredCapability: "products" },
  { name: "get_delivery_information", requiredCapability: "delivery" },
  { name: "create_order_request", requiredCapability: "ordering" },
  { name: "request_booking", requiredCapability: "booking" },
];

export function buildToolList(enabledCapabilityKeys: string[]): string[] {
  const capSet = new Set(enabledCapabilityKeys);
  const optional = OPTIONAL_TOOLS.filter((t) =>
    capSet.has(t.requiredCapability),
  ).map((t) => t.name);
  return [...BASE_TOOLS, ...optional];
}
