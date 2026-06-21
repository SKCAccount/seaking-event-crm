import { CRM } from "@/components/atomic-crm/root/CRM";

/**
 * Application entry point
 *
 * Customize Atomic CRM by passing props to the CRM component:
 *  - companySectors
 *  - darkTheme
 *  - dealCategories
 *  - dealPipelineStatuses
 *  - dealStages
 *  - lightTheme
 *  - logo
 *  - noteStatuses
 *  - taskTypes
 *  - title
 * ... as well as all the props accepted by shadcn-admin-kit's <Admin> component.
 *
 * @example
 * const App = () => (
 *    <CRM
 *       logo="./img/logo.png"
 *       title="Acme CRM"
 *    />
 * );
 */
const App = () => (
  <CRM
    title="Sea King Capital"
    lightModeLogo="./logos/logo_seaking_light.svg"
    darkModeLogo="./logos/logo_seaking_dark.svg"
    dealStages={[
      { value: "identified", label: "Identified" },
      { value: "researching", label: "Researching" },
      { value: "outreach-sent", label: "Outreach Sent" },
      { value: "in-conversation", label: "In Conversation" },
      { value: "confirmed", label: "Confirmed" },
      { value: "delivered", label: "Delivered" },
      { value: "passed", label: "Passed" },
    ]}
    dealPipelineStatuses={["confirmed", "delivered"]}
  />
);

export default App;
