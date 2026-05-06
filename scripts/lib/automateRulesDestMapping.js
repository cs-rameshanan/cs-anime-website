import axios from "axios";

export function axiosAutomate(baseUrl, headers) {
  const base = baseUrl.replace(/\/$/, "");
  return axios.create({
    baseURL: base,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    validateStatus: () => true,
  });
}

export function asConnectorList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.connectors)) return data.connectors;
  return [];
}

export function asTriggerOrActionList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.triggers)) return data.triggers;
  if (Array.isArray(data?.actions)) return data.actions;
  return [];
}

export function cleanInputData(input_data) {
  if (input_data == null || input_data === "") return input_data;
  if (typeof input_data !== "string") return input_data;
  return input_data.replace(/\{\(.+?\)\}/gi, "");
}

/** Compare connector group names across exports vs API (underscores, case). */
function normalizeAutomateGroupKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/_/g, "")
    .replace(/\s+/g, "");
}

/**
 * Export JSON uses some `group_name` values that differ from Automate API `connector.group_name`
 * (e.g. `code` vs `codeblock`). Map export → additional API names to try.
 */
const EXPORT_GROUP_EXTRA_API_NAMES = {
  code: ["codeblock", "code_block"],
  brandkit: ["brand_kit"],
};

function listConnectorGroupNames(list) {
  return [...new Set(list.map((c) => c.group_name).filter(Boolean))].sort();
}

function findConnectorForExportGroup(list, exportGroupName) {
  const eg = String(exportGroupName || "");
  const nEg = normalizeAutomateGroupKey(eg);

  for (const c of list) {
    if (normalizeAutomateGroupKey(c.group_name) === nEg) return c;
  }

  const extras = EXPORT_GROUP_EXTRA_API_NAMES[eg.toLowerCase()] || [];
  for (const alt of extras) {
    const nAlt = normalizeAutomateGroupKey(alt);
    for (const c of list) {
      if (normalizeAutomateGroupKey(c.group_name) === nAlt) return c;
    }
  }

  return null;
}

/**
 * Build `connectors[exportGroupName]` for each entry in `step_groups` (export JSON wording).
 * Uses the full GET /connectors list — **not** exact string match to API group_name (fixes
 * `brandkit` vs `brand_kit`, `code` vs `codeblock`, etc.).
 */
export async function getConnectors(client, stepGroups) {
  const { data, status } = await client.get("/connectors");
  if (status >= 400) {
    throw new Error(`GET /connectors failed (${status}): ${JSON.stringify(data).slice(0, 500)}`);
  }
  const list = asConnectorList(data);
  if (!list.length) {
    throw new Error("GET /connectors returned no connectors.");
  }

  const map = {};
  const uniqueExportGroups = [...new Set(stepGroups)];

  for (const exportGroup of uniqueExportGroups) {
    const connector = findConnectorForExportGroup(list, exportGroup);
    if (!connector) {
      const available = listConnectorGroupNames(list);
      throw new Error(
        `No connector for action/trigger group "${exportGroup}" (export name). ` +
          `Available connector group_name values on this stack: ${available.join(", ")}. ` +
          `If Brand Kit is missing, enable it for the org/region or use an export without that step.`
      );
    }
    map[exportGroup] = connector;
  }
  return map;
}

export async function getTriggers(client, connectors, group_name) {
  if (!connectors[group_name]) {
    throw new Error(`No connector for trigger group: ${group_name}`);
  }
  connectors[group_name].triggers = {};
  const cid = connectors[group_name].id;
  const { data, status } = await client.get(`/connectors/${cid}/triggers`);
  if (status >= 400) {
    throw new Error(`GET triggers failed (${status}): ${JSON.stringify(data).slice(0, 500)}`);
  }
  const resp = asTriggerOrActionList(data);
  for (const trigger of resp) {
    connectors[group_name].triggers[trigger.title] = trigger;
  }
}

export async function getActions(client, connectors, group_name) {
  if (group_name === "ifelse" || group_name === "loop" || group_name === "repeat") {
    return;
  }
  if (!connectors[group_name]) {
    throw new Error(`No connector for action group: ${group_name}`);
  }
  connectors[group_name].actions = {};
  const cid = connectors[group_name].id;
  const { data, status } = await client.get(`/connectors/${cid}/actions`);
  if (status >= 400) {
    throw new Error(`GET actions failed (${status}): ${JSON.stringify(data).slice(0, 500)}`);
  }
  const resp = asTriggerOrActionList(data);
  for (const action of resp) {
    connectors[group_name].actions[action.title] = action;
  }
}

async function getActionId(connectors, group_name, action_title) {
  if (!connectors[group_name]?.actions?.[action_title]) {
    throw new Error(`Unknown action "${action_title}" for group "${group_name}"`);
  }
  return connectors[group_name].actions[action_title].id;
}

async function getActionVersion(connectors, group_name, action_title) {
  return connectors[group_name].actions[action_title].version;
}

export async function resetStepData(client, connectors, step) {
  step.tested = false;
  step.skipped = false;
  step.auth = null;
  step.output_data = JSON.stringify({});
  step.input_data = cleanInputData(step.input_data);

  if (step.group_name === "ifelse") {
    const inputs = step.input ?? [];
    const out = [];
    for (const input of inputs) {
      input.steps = input.steps ?? [];
      const inner = [];
      for (const s of input.steps) {
        inner.push(await resetStepData(client, connectors, s));
      }
      input.steps = inner;
      out.push(input);
    }
    step.input = out;
  } else if (step.group_name === "loop" || step.group_name === "repeat") {
    const res = [];
    for (const step1 of step.steps ?? []) {
      res.push(await resetStepData(client, connectors, step1));
    }
    step.steps = res;
  } else {
    step.id = await getActionId(connectors, step.group_name, step.action_title);
    step.origin_id = step.id;
    step.version = await getActionVersion(connectors, step.group_name, step.action_title);
    step.connector_id = connectors[step.group_name].id;
  }
  return step;
}

export async function getStepsForTemplate(client, connectors, rule) {
  const result = [];
  for (const step of rule.steps) {
    result.push(await resetStepData(client, connectors, step));
  }
  return result;
}

/**
 * Build destination trigger + import block. Supports:
 * - API-fetched rules with `trigger.id` (usertriggers on sourceClient)
 * - Exported JSON with empty `trigger.id` (resolve by dest connector ids, optional source GET for title, env, or single trigger)
 */
export async function resolveTriggerForDestination(destClient, connectors, rule, sourceClient) {
  const group_name = rule.step_groups[0];
  if (!connectors[group_name]) {
    throw new Error(`Destination has no connector for trigger group: ${group_name}`);
  }
  if (!connectors[group_name].triggers) {
    throw new Error(`Triggers not loaded for group: ${group_name}`);
  }

  const triggersMap = connectors[group_name].triggers;
  const imp = rule.trigger?.import;
  const firstStepName = rule.steps?.[0]?.name;
  const next =
    Array.isArray(rule.trigger?.next) && rule.trigger.next.length
      ? [...rule.trigger.next]
      : firstStepName
        ? [firstStepName]
        : [];
  const filters = imp?.filters || "[]";

  if (imp?.connector_id && imp?.trigger_id) {
    const probe = await destClient.get(`/connectors/${imp.connector_id}/triggers/${imp.trigger_id}`);
    if (probe.status < 400 && probe.data?.title && triggersMap[probe.data.title]) {
      const destT = triggersMap[probe.data.title];
      return {
        id: "",
        next,
        import: {
          connector_id: connectors[group_name].id,
          trigger_id: destT.id,
          filters,
        },
      };
    }
  }

  let title = process.env.CONTENTSTACK_AUTOMATE_TRIGGER_TITLE?.trim() || null;

  const tid = rule.trigger?.id;
  if (tid && sourceClient) {
    const userTriggerResp = await sourceClient.get(`/usertriggers/${tid}`);
    if (userTriggerResp.status >= 400) {
      throw new Error(
        `GET /usertriggers/${tid} failed (${userTriggerResp.status}): ${JSON.stringify(userTriggerResp.data).slice(0, 500)}`
      );
    }
    const userTrigger = userTriggerResp.data;
    const resp = await sourceClient.get(
      `/connectors/${userTrigger.connector_id}/triggers/${userTrigger.trigger_id}`
    );
    if (resp.status >= 400) {
      throw new Error(`GET source trigger failed (${resp.status}): ${JSON.stringify(resp.data).slice(0, 500)}`);
    }
    title = resp.data?.title || title;
  } else if (!title && sourceClient && imp?.connector_id && imp?.trigger_id) {
    const resp = await sourceClient.get(`/connectors/${imp.connector_id}/triggers/${imp.trigger_id}`);
    if (resp.status < 400 && resp.data?.title) title = resp.data.title;
  }

  if (!title) {
    const keys = Object.keys(triggersMap);
    if (keys.length === 1) title = keys[0];
  }
  if (!title) {
    throw new Error(
      `Could not resolve trigger title for group "${group_name}". Set CONTENTSTACK_AUTOMATE_TRIGGER_TITLE (e.g. HTTP trigger title), or provide sourceClient so export connector/trigger ids can be resolved. Available on destination: ${Object.keys(triggersMap).join(", ")}`
    );
  }

  const destT = triggersMap[title];
  if (!destT) {
    throw new Error(
      `Destination has no trigger titled "${title}" for group ${group_name}. Available: ${Object.keys(triggersMap).join(", ")}`
    );
  }

  return {
    id: "",
    next,
    import: {
      connector_id: connectors[group_name].id,
      trigger_id: destT.id,
      filters,
    },
  };
}

export async function buildPostedRuleBody(destClient, connectors, destOrg, rule, sourceClient) {
  const trigger = await resolveTriggerForDestination(destClient, connectors, rule, sourceClient);
  const steps = await getStepsForTemplate(destClient, connectors, rule);

  const base = { ...rule };
  delete base._id;
  delete base.created_by;
  delete base.__v;
  delete base.id;
  delete base.updated_by;

  return {
    ...base,
    steps,
    trigger,
    active: false,
    published: false,
    user_id: null,
    org_id: destOrg,
    project_id: null,
    share_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    isDraftRule: true,
  };
}

export async function loadConnectorsForRule(destClient, rule) {
  const stepGroups = rule.step_groups || [];
  const connectors = await getConnectors(destClient, stepGroups);
  for (let i = 0; i < stepGroups.length; i++) {
    const group_name = stepGroups[i];
    if (i === 0) {
      await getTriggers(destClient, connectors, group_name);
    } else {
      await getActions(destClient, connectors, group_name);
    }
  }
  return connectors;
}
