const sourceTextarea = document.getElementById("sourceTextarea");
const targetTextarea = document.getElementById("targetTextarea");
const sourceTypeSelect = document.getElementById("sourceTypeSelect");
const sourceFileInput = document.getElementById("sourceFileInput");
const targetFileInput = document.getElementById("targetFileInput");
const importRulesInput = document.getElementById("importRulesInput");
const parseDataButton = document.getElementById("parseDataButton");
const loadSampleButton = document.getElementById("loadSampleButton");
const clearButton = document.getElementById("clearButton");
const autoMapButton = document.getElementById("autoMapButton");
const generateOutputButton = document.getElementById("generateOutputButton");
const generateOutputButtonBottom = document.getElementById("generateOutputButtonBottom");
const copyOutputButton = document.getElementById("copyOutputButton");
const copyOutputButtonBottom = document.getElementById("copyOutputButtonBottom");
const downloadOutputButton = document.getElementById("downloadOutputButton");
const downloadOutputButtonBottom = document.getElementById("downloadOutputButtonBottom");
const saveRulesButton = document.getElementById("saveRulesButton");
const exportRulesButton = document.getElementById("exportRulesButton");
const exportRulesButtonBottom = document.getElementById("exportRulesButtonBottom");
const statusMessage = document.getElementById("statusMessage");
const sourceFieldsCount = document.getElementById("sourceFieldsCount");
const targetFieldsCount = document.getElementById("targetFieldsCount");
const activeMappingsCount = document.getElementById("activeMappingsCount");
const unmappedTargetsCount = document.getElementById("unmappedTargetsCount");
const outputSizeCount = document.getElementById("outputSizeCount");
const sourceFieldsBadge = document.getElementById("sourceFieldsBadge");
const targetFieldsBadge = document.getElementById("targetFieldsBadge");
const sourceFieldsList = document.getElementById("sourceFieldsList");
const targetFieldsList = document.getElementById("targetFieldsList");
const mappingRulesTableBody = document.getElementById("mappingRulesTableBody");
const connectionSvg = document.getElementById("connectionSvg");
const canvasEmptyState = document.getElementById("canvasEmptyState");
const outputPreview = document.getElementById("outputPreview");
const savedMappingsList = document.getElementById("savedMappingsList");

let rawSourceText = "";
let rawTargetText = "";
let sourceType = "auto";
let sourceData = null;
let targetTemplate = null;
let sourceFields = [];
let targetFields = [];
let mappings = [];
let selectedSourceField = null;
let transformedOutput = null;
let savedMappingRules = [];

/**
 * Detects whether pasted text appears to be JSON, XML, or unknown.
 */
function detectDataType(text) {
    const trimmed = text.trim();

    if (!trimmed) {
        return "unknown";
    }

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return "json";
    }

    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        return "xml";
    }

    return "unknown";
}

/**
 * Parses source data as JSON or XML and returns a structured validation result.
 */
function parseSourceData(text, preferredType) {
    const detectedType = preferredType === "auto" ? detectDataType(text) : preferredType;

    if (detectedType === "json") {
        try {
            return { valid: true, type: "json", data: JSON.parse(text) };
        } catch (error) {
            return { valid: false, error: `Invalid source JSON: ${error.message}` };
        }
    }

    if (detectedType === "xml") {
        const parser = new DOMParser();
        const xmlDocument = parser.parseFromString(text, "application/xml");
        const parserError = xmlDocument.querySelector("parsererror");

        if (parserError) {
            return { valid: false, error: "Invalid source XML. Please check tag structure and syntax." };
        }

        return { valid: true, type: "xml", data: xmlToObject(xmlDocument.documentElement) };
    }

    return { valid: false, error: "Unable to detect source type. Choose JSON or XML manually." };
}

/**
 * Parses the target JSON template and returns a validation result.
 */
function parseTargetTemplate(text) {
    try {
        return { valid: true, data: JSON.parse(text) };
    } catch (error) {
        return { valid: false, error: `Invalid target JSON template: ${error.message}` };
    }
}

/**
 * Converts an XML node into a plain JavaScript object.
 */
function xmlToObject(xmlNode) {
    const result = {};
    const children = Array.from(xmlNode.children);
    const text = xmlNode.childNodes.length === 1 ? xmlNode.textContent.trim() : "";

    if (xmlNode.attributes && xmlNode.attributes.length > 0) {
        result["@attributes"] = {};
        Array.from(xmlNode.attributes).forEach((attribute) => {
            result["@attributes"][attribute.name] = attribute.value;
        });
    }

    if (children.length === 0) {
        if (Object.keys(result).length > 0) {
            result["#text"] = text;
            return result;
        }

        return text;
    }

    children.forEach((child) => {
        const childValue = xmlToObject(child);

        if (Object.prototype.hasOwnProperty.call(result, child.nodeName)) {
            if (!Array.isArray(result[child.nodeName])) {
                result[child.nodeName] = [result[child.nodeName]];
            }

            result[child.nodeName].push(childValue);
        } else {
            result[child.nodeName] = childValue;
        }
    });

    return { [xmlNode.nodeName]: result };
}

/**
 * Recursively extracts mappable fields from objects, arrays, primitives, and null values.
 */
function flattenFields(value, path, fields, depth) {
    const type = getValueType(value);
    const label = path ? path.split(".").pop().replace(/\[\d+\]/g, "") : "root";

    fields.push({
        id: `field-${fields.length}-${path || "root"}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
        path: path || "root",
        label,
        value,
        type,
        depth
    });

    if (type === "object") {
        Object.keys(value).forEach((key) => {
            const nextPath = path ? `${path}.${key}` : key;
            flattenFields(value[key], nextPath, fields, depth + 1);
        });
    }

    if (type === "array") {
        value.forEach((item, index) => {
            const nextPath = path ? `${path}[${index}]` : `[${index}]`;
            flattenFields(item, nextPath, fields, depth + 1);
        });
    }
}

/**
 * Returns a normalized value type name.
 */
function getValueType(value) {
    if (value === null) {
        return "null";
    }

    if (Array.isArray(value)) {
        return "array";
    }

    return typeof value;
}

/**
 * Renders clickable and draggable source field cards.
 */
function renderSourceFields(fields) {
    if (fields.length === 0) {
        sourceFieldsList.innerHTML = '<div class="empty-state">No source fields found.</div>';
        sourceFieldsBadge.textContent = "0 fields";
        return;
    }

    sourceFieldsList.innerHTML = fields.map((field) => `
    <button class="field-card source-field" type="button" draggable="true" data-field-id="${escapeHtml(field.id)}">
      <span class="field-path">${escapeHtml(field.path)}</span>
      <span class="field-meta">
        <span class="type-badge">${escapeHtml(field.type)}</span>
        <span>Depth ${field.depth}</span>
      </span>
      <span class="field-preview">${escapeHtml(formatValue(field.value))}</span>
    </button>
  `).join("");

    sourceFieldsBadge.textContent = `${fields.length} fields`;

    document.querySelectorAll(".source-field").forEach((card) => {
        card.addEventListener("click", () => selectSourceField(card.dataset.fieldId));
        card.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", card.dataset.fieldId);
            selectSourceField(card.dataset.fieldId);
        });
    });
}

/**
 * Renders clickable and droppable target field cards.
 */
function renderTargetFields(fields) {
    if (fields.length === 0) {
        targetFieldsList.innerHTML = '<div class="empty-state">No target fields found.</div>';
        targetFieldsBadge.textContent = "0 fields";
        return;
    }

    targetFieldsList.innerHTML = fields.map((field) => {
        const mapped = mappings.some((mapping) => mapping.targetFieldId === field.id);
        return `
      <button class="field-card target-field ${mapped ? "mapped" : ""}" type="button" data-field-id="${escapeHtml(field.id)}">
        <span class="field-path">${escapeHtml(field.path)}</span>
        <span class="field-meta">
          <span class="type-badge">${escapeHtml(field.type)}</span>
          <span>${mapped ? "Mapped" : "Unmapped"}</span>
        </span>
        <span class="field-preview">${escapeHtml(formatValue(field.value))}</span>
      </button>
    `;
    }).join("");

    targetFieldsBadge.textContent = `${fields.length} fields`;

    document.querySelectorAll(".target-field").forEach((card) => {
        card.addEventListener("click", () => {
            if (selectedSourceField) {
                connectFields(selectedSourceField.id, card.dataset.fieldId);
            } else {
                showStatus("Select a source field first, then choose a target field.", "info");
            }
        });

        card.addEventListener("dragover", (event) => event.preventDefault());
        card.addEventListener("drop", (event) => {
            event.preventDefault();
            connectFields(event.dataTransfer.getData("text/plain"), card.dataset.fieldId);
        });
    });
}

/**
 * Stores the selected source field and updates source card highlighting.
 */
function selectSourceField(fieldId) {
    selectedSourceField = sourceFields.find((field) => field.id === fieldId) || null;

    document.querySelectorAll(".source-field").forEach((card) => {
        card.classList.toggle("selected", card.dataset.fieldId === fieldId);
    });

    if (selectedSourceField) {
        showStatus(`Selected source field: ${selectedSourceField.path}`, "info");
    }
}

/**
 * Creates or replaces a source-to-target mapping rule.
 */
function connectFields(sourceFieldId, targetFieldId) {
    const sourceField = sourceFields.find((field) => field.id === sourceFieldId);
    const targetField = targetFields.find((field) => field.id === targetFieldId);

    if (!sourceField || !targetField) {
        showStatus("Unable to create mapping because one field was not found.", "error");
        return;
    }

    mappings = mappings.filter((mapping) => mapping.targetFieldId !== targetFieldId);
    mappings.push({
        sourceFieldId,
        targetFieldId,
        sourcePath: sourceField.path,
        targetPath: targetField.path,
        sourceType: sourceField.type
    });

    renderTargetFields(targetFields);
    renderMappingRules();
    renderStats();
    drawConnectionLines();
    showStatus(`Mapped ${sourceField.path} to ${targetField.path}.`, "success");
}

/**
 * Removes a mapping rule by target field id or target path.
 */
function removeMapping(targetFieldId) {
    mappings = mappings.filter((mapping) => mapping.targetFieldId !== targetFieldId && mapping.targetPath !== targetFieldId);
    renderTargetFields(targetFields);
    renderMappingRules();
    renderStats();
    drawConnectionLines();
    showStatus("Mapping removed.", "success");
}

/**
 * Automatically maps fields with similar normalized names.
 */
function autoMapSimilarNames() {
    if (sourceFields.length === 0 || targetFields.length === 0) {
        showStatus("Parse source data and target template before auto-mapping.", "error");
        return;
    }

    let created = 0;

    targetFields.forEach((targetField) => {
        if (targetField.type === "object" || targetField.type === "array") {
            return;
        }

        const targetName = normalizeFieldName(targetField.label);
        const sourceField = sourceFields.find((field) => {
            const normalizedSource = normalizeFieldName(field.label);
            const normalizedPath = normalizeFieldName(field.path.split(".").pop());
            return normalizedSource === targetName || normalizedPath === targetName;
        });

        if (sourceField) {
            connectFields(sourceField.id, targetField.id);
            created += 1;
        }
    });

    showStatus(`Auto-map created or refreshed ${created} mapping(s).`, created > 0 ? "success" : "info");
}

/**
 * Normalizes field names and expands common aliases for matching.
 */
function normalizeFieldName(name) {
    const aliases = {
        fname: "firstname",
        first: "firstname",
        lname: "lastname",
        last: "lastname",
        phone: "phonenumber",
        mobile: "phonenumber",
        emailaddress: "email",
        orderid: "id",
        order_id: "id",
        totalamount: "total",
        total_amount: "total",
        status: "accountstatus",
        id: "customerid"
    };

    const normalized = String(name).replace(/[_\-\s.[\]\d]/g, "").toLowerCase();
    return aliases[normalized] || normalized;
}

/**
 * Renders the active mapping rules table.
 */
function renderMappingRules() {
    if (mappings.length === 0) {
        mappingRulesTableBody.innerHTML = `
      <tr>
        <td colspan="4"><div class="empty-state">No active mappings yet.</div></td>
      </tr>
    `;
        return;
    }

    mappingRulesTableBody.innerHTML = mappings.map((mapping) => `
    <tr>
      <td>${escapeHtml(mapping.sourcePath)}</td>
      <td>${escapeHtml(mapping.targetPath)}</td>
      <td><span class="type-badge">${escapeHtml(mapping.sourceType)}</span></td>
      <td>
        <button class="btn btn-sm btn-danger remove-mapping-button" type="button" data-target-field-id="${escapeHtml(mapping.targetFieldId)}">
          Remove
        </button>
      </td>
    </tr>
  `).join("");

    document.querySelectorAll(".remove-mapping-button").forEach((button) => {
        button.addEventListener("click", () => removeMapping(button.dataset.targetFieldId));
    });
}

/**
 * Draws SVG connection paths between mapped source and target cards.
 */
function drawConnectionLines() {
    connectionSvg.innerHTML = "";

    if (mappings.length === 0) {
        canvasEmptyState.classList.remove("d-none");
        return;
    }

    canvasEmptyState.classList.add("d-none");

    const svgRect = connectionSvg.getBoundingClientRect();

    mappings.forEach((mapping) => {
        const sourceCard = document.querySelector(`.source-field[data-field-id="${CSS.escape(mapping.sourceFieldId)}"]`);
        const targetCard = document.querySelector(`.target-field[data-field-id="${CSS.escape(mapping.targetFieldId)}"]`);

        if (!sourceCard || !targetCard) {
            return;
        }

        const sourceRect = sourceCard.getBoundingClientRect();
        const targetRect = targetCard.getBoundingClientRect();
        const startX = sourceRect.right - svgRect.left;
        const startY = sourceRect.top + sourceRect.height / 2 - svgRect.top;
        const endX = targetRect.left - svgRect.left;
        const endY = targetRect.top + targetRect.height / 2 - svgRect.top;
        const curve = Math.max(60, Math.abs(endX - startX) * 0.45);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        path.setAttribute("class", "connection-line");
        path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
        connectionSvg.appendChild(path);
    });
}

/**
 * Reads a nested value using dot and bracket path syntax.
 */
function getValueByPath(data, path) {
    if (path === "root") {
        return data;
    }

    const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    return segments.reduce((current, segment) => {
        if (current === undefined || current === null) {
            return undefined;
        }

        return current[segment];
    }, data);
}

/**
 * Writes a value into a nested object using dot and bracket path syntax.
 */
function setValueByPath(data, path, value) {
    const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let current = data;

    segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
            current[segment] = value;
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(current, segment) || current[segment] === null) {
            current[segment] = Number.isInteger(Number(segments[index + 1])) ? [] : {};
        }

        current = current[segment];
    });
}

/**
 * Applies mapping rules to a cloned target template and generates output JSON.
 */
function generateOutput() {
    if (!targetTemplate || !sourceData) {
        showStatus("Parse source data and target template before generating output.", "error");
        return;
    }

    if (mappings.length === 0) {
        showStatus("Create at least one mapping before generating output.", "error");
        return;
    }

    const output = JSON.parse(JSON.stringify(targetTemplate));

    mappings.forEach((mapping) => {
        const sourceValue = getValueByPath(sourceData, mapping.sourcePath);
        setValueByPath(output, mapping.targetPath, sourceValue);
    });

    transformedOutput = output;
    renderOutputPreview(output);
    renderStats();
    showStatus("Transformed output generated successfully.", "success");
}

/**
 * Pretty-prints generated output JSON.
 */
function renderOutputPreview(output) {
    outputPreview.textContent = output ? JSON.stringify(output, null, 2) : "No output generated yet.";
}

/**
 * Updates all stats pills.
 */
function renderStats() {
    const unmappedTargets = targetFields.filter((field) => {
        const isContainer = field.type === "object" || field.type === "array";
        const isMapped = mappings.some((mapping) => mapping.targetFieldId === field.id);
        return !isContainer && !isMapped;
    }).length;
    const outputText = transformedOutput ? JSON.stringify(transformedOutput, null, 2) : "";

    sourceFieldsCount.textContent = sourceFields.length;
    targetFieldsCount.textContent = targetFields.length;
    activeMappingsCount.textContent = mappings.length;
    unmappedTargetsCount.textContent = unmappedTargets;
    outputSizeCount.textContent = formatBytes(new Blob([outputText]).size);
}

/**
 * Reads input text, validates it, parses data, flattens fields, and renders the workspace.
 */
function handleParseData() {
    setLoading(true);

    rawSourceText = sourceTextarea.value.trim();
    rawTargetText = targetTextarea.value.trim();
    sourceType = sourceTypeSelect.value;

    if (!rawSourceText || !rawTargetText) {
        showStatus("Source data and target template are both required.", "error");
        setLoading(false);
        return;
    }

    const parsedSource = parseSourceData(rawSourceText, sourceType);
    const parsedTarget = parseTargetTemplate(rawTargetText);

    if (!parsedSource.valid) {
        showStatus(parsedSource.error, "error");
        setLoading(false);
        return;
    }

    if (!parsedTarget.valid) {
        showStatus(parsedTarget.error, "error");
        setLoading(false);
        return;
    }

    sourceData = parsedSource.data;
    targetTemplate = parsedTarget.data;
    sourceFields = [];
    targetFields = [];
    mappings = [];
    selectedSourceField = null;
    transformedOutput = null;

    flattenFields(sourceData, "", sourceFields, 0);
    flattenFields(targetTemplate, "", targetFields, 0);
    renderSourceFields(sourceFields);
    renderTargetFields(targetFields);
    renderMappingRules();
    renderOutputPreview(null);
    renderStats();
    drawConnectionLines();
    showStatus(`Parsed ${parsedSource.type.toUpperCase()} source data and target JSON template successfully.`, "success");
    setLoading(false);
}

/**
 * Imports a source JSON or XML file into the source textarea.
 */
function handleSourceFileImport(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        sourceTextarea.value = reader.result;
        sourceTypeSelect.value = file.name.toLowerCase().endsWith(".xml") ? "xml" : "json";
        showStatus(`Imported source file: ${file.name}`, "success");
    };

    reader.onerror = () => showStatus("Unable to read source file.", "error");
    reader.readAsText(file);
}

/**
 * Imports a target JSON template file into the target textarea.
 */
function handleTargetFileImport(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        targetTextarea.value = reader.result;
        showStatus(`Imported target template file: ${file.name}`, "success");
    };

    reader.onerror = () => showStatus("Unable to read target template file.", "error");
    reader.readAsText(file);
}

/**
 * Loads realistic sample source data and target template content.
 */
function loadSampleMapping() {
    const sampleSource = {
        fname: "Ali",
        lname: "Raza",
        email_address: "ali.raza@example.com",
        phone: "+92-300-1234567",
        customer: {
            id: 101,
            status: "active"
        },
        address: {
            city: "Karachi",
            country: "Pakistan"
        },
        orders: [
            {
                order_id: "ORD-1001",
                total_amount: 2500
            }
        ]
    };

    const sampleTarget = {
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        customerId: "",
        accountStatus: "",
        location: {
            city: "",
            country: ""
        },
        latestOrder: {
            id: "",
            total: 0
        }
    };

    sourceTextarea.value = JSON.stringify(sampleSource, null, 2);
    targetTextarea.value = JSON.stringify(sampleTarget, null, 2);
    sourceTypeSelect.value = "json";
    showStatus("Sample mapping loaded. Click Parse Data to extract fields.", "success");
}

/**
 * Copies transformed output JSON to the clipboard.
 */
function copyOutputJson() {
    if (!transformedOutput) {
        showStatus("Generate output before copying JSON.", "error");
        return;
    }

    navigator.clipboard.writeText(JSON.stringify(transformedOutput, null, 2))
        .then(() => showStatus("Output JSON copied to clipboard.", "success"))
        .catch(() => showStatus("Clipboard access failed. Copy manually from the output preview.", "error"));
}

/**
 * Downloads transformed output as mapped-output.json.
 */
function downloadOutputJson() {
    if (!transformedOutput) {
        showStatus("Generate output before downloading JSON.", "error");
        return;
    }

    const blob = new Blob([JSON.stringify(transformedOutput, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "mapped-output.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus("Output JSON download started.", "success");
}

/**
 * Saves current mapping rules to localStorage with a user-provided name.
 */
function saveMappingRules() {
    if (mappings.length === 0) {
        showStatus("Create mappings before saving rules.", "error");
        return;
    }

    const name = window.prompt("Name this mapping rule set:");

    if (!name) {
        showStatus("Save cancelled.", "info");
        return;
    }

    const savedItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name,
        createdAt: new Date().toISOString(),
        mappings
    };

    savedMappingRules = [savedItem, ...savedMappingRules];
    localStorage.setItem("dataMapperSavedRules", JSON.stringify(savedMappingRules));
    renderSavedMappings();
    showStatus(`Saved mapping rules: ${name}`, "success");
}

/**
 * Downloads active mapping rules as data-mapping-rules.json.
 */
function exportMappingRules() {
    if (mappings.length === 0) {
        showStatus("Create mappings before exporting rules.", "error");
        return;
    }

    const payload = {
        app: "Data Mapper",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        mappings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "data-mapping-rules.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus("Mapping rules export started.", "success");
}

/**
 * Imports mapping rules from a JSON file and applies compatible rules.
 */
function importMappingRules(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const payload = JSON.parse(reader.result);
            const importedMappings = Array.isArray(payload) ? payload : payload.mappings;

            if (!Array.isArray(importedMappings)) {
                throw new Error("Mapping rules file must include a mappings array.");
            }

            mappings = importedMappings.filter((mapping) => {
                const sourceExists = sourceFields.some((field) => field.path === mapping.sourcePath);
                const targetExists = targetFields.some((field) => field.path === mapping.targetPath);
                return sourceExists && targetExists;
            }).map((mapping) => {
                const sourceField = sourceFields.find((field) => field.path === mapping.sourcePath);
                const targetField = targetFields.find((field) => field.path === mapping.targetPath);
                return {
                    sourceFieldId: sourceField.id,
                    targetFieldId: targetField.id,
                    sourcePath: sourceField.path,
                    targetPath: targetField.path,
                    sourceType: sourceField.type
                };
            });

            renderTargetFields(targetFields);
            renderMappingRules();
            renderStats();
            drawConnectionLines();
            showStatus(`Imported ${mappings.length} compatible mapping rule(s).`, "success");
        } catch (error) {
            showStatus(`Unable to import mapping rules: ${error.message}`, "error");
        }
    };

    reader.onerror = () => showStatus("Unable to read mapping rules file.", "error");
    reader.readAsText(file);
}

/**
 * Renders saved mapping rule sets from localStorage.
 */
function renderSavedMappings() {
    const storedRules = localStorage.getItem("dataMapperSavedRules");
    savedMappingRules = storedRules ? JSON.parse(storedRules) : [];

    if (savedMappingRules.length === 0) {
        savedMappingsList.innerHTML = '<div class="empty-state">No saved mapping rules yet.</div>';
        return;
    }

    savedMappingsList.innerHTML = savedMappingRules.map((item) => `
    <div class="saved-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.mappings.length)} rules · ${escapeHtml(new Date(item.createdAt).toLocaleString())}</span>
      </div>
      <div class="utility-row">
        <button class="btn btn-sm btn-outline-info load-saved-button" type="button" data-id="${escapeHtml(item.id)}">Load</button>
        <button class="btn btn-sm btn-danger delete-saved-button" type="button" data-id="${escapeHtml(item.id)}">Delete</button>
      </div>
    </div>
  `).join("");

    document.querySelectorAll(".load-saved-button").forEach((button) => {
        button.addEventListener("click", () => loadSavedMapping(button.dataset.id));
    });

    document.querySelectorAll(".delete-saved-button").forEach((button) => {
        button.addEventListener("click", () => deleteSavedMapping(button.dataset.id));
    });
}

/**
 * Loads saved mapping rules into the current workspace when paths are compatible.
 */
function loadSavedMapping(id) {
    const savedItem = savedMappingRules.find((item) => item.id === id);

    if (!savedItem) {
        showStatus("Saved mapping set was not found.", "error");
        return;
    }

    mappings = savedItem.mappings.filter((mapping) => {
        return sourceFields.some((field) => field.path === mapping.sourcePath) &&
            targetFields.some((field) => field.path === mapping.targetPath);
    }).map((mapping) => {
        const sourceField = sourceFields.find((field) => field.path === mapping.sourcePath);
        const targetField = targetFields.find((field) => field.path === mapping.targetPath);
        return {
            sourceFieldId: sourceField.id,
            targetFieldId: targetField.id,
            sourcePath: sourceField.path,
            targetPath: targetField.path,
            sourceType: sourceField.type
        };
    });

    renderTargetFields(targetFields);
    renderMappingRules();
    renderStats();
    drawConnectionLines();
    showStatus(`Loaded ${mappings.length} compatible rule(s) from ${savedItem.name}.`, "success");
}

/**
 * Deletes a saved mapping rule set from localStorage.
 */
function deleteSavedMapping(id) {
    savedMappingRules = savedMappingRules.filter((item) => item.id !== id);
    localStorage.setItem("dataMapperSavedRules", JSON.stringify(savedMappingRules));
    renderSavedMappings();
    showStatus("Saved mapping rules deleted.", "success");
}

/**
 * Resets app state, inputs, rendered fields, mappings, output, stats, and status.
 */
function handleClear() {
    rawSourceText = "";
    rawTargetText = "";
    sourceType = "auto";
    sourceData = null;
    targetTemplate = null;
    sourceFields = [];
    targetFields = [];
    mappings = [];
    selectedSourceField = null;
    transformedOutput = null;

    sourceTextarea.value = "";
    targetTextarea.value = "";
    sourceTypeSelect.value = "auto";
    sourceFileInput.value = "";
    targetFileInput.value = "";
    importRulesInput.value = "";
    sourceFieldsList.innerHTML = '<div class="empty-state">Parse source data to view fields.</div>';
    targetFieldsList.innerHTML = '<div class="empty-state">Parse target template to view fields.</div>';
    sourceFieldsBadge.textContent = "0 fields";
    targetFieldsBadge.textContent = "0 fields";
    renderMappingRules();
    renderOutputPreview(null);
    renderStats();
    drawConnectionLines();
    showStatus("Workspace cleared.", "info");
}

/**
 * Converts a value into a readable preview string.
 */
function formatValue(value) {
    const type = getValueType(value);

    if (type === "object" || type === "array") {
        return JSON.stringify(value).slice(0, 90);
    }

    if (type === "string") {
        return value;
    }

    return String(value);
}

/**
 * Converts a byte count into a readable size.
 */
function formatBytes(bytes) {
    if (bytes === 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, unitIndex);

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Escapes HTML special characters before inserting trusted generated markup.
 */
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Shows a status message using success, error, or info styling.
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-area ${type}`;
}

/**
 * Toggles loading state for primary processing buttons.
 */
function setLoading(isLoading) {
    parseDataButton.disabled = isLoading;
    generateOutputButton.disabled = isLoading;
    generateOutputButtonBottom.disabled = isLoading;
}

parseDataButton.addEventListener("click", handleParseData);
loadSampleButton.addEventListener("click", loadSampleMapping);
clearButton.addEventListener("click", handleClear);
autoMapButton.addEventListener("click", autoMapSimilarNames);
generateOutputButton.addEventListener("click", generateOutput);
generateOutputButtonBottom.addEventListener("click", generateOutput);
copyOutputButton.addEventListener("click", copyOutputJson);
copyOutputButtonBottom.addEventListener("click", copyOutputJson);
downloadOutputButton.addEventListener("click", downloadOutputJson);
downloadOutputButtonBottom.addEventListener("click", downloadOutputJson);
saveRulesButton.addEventListener("click", saveMappingRules);
exportRulesButton.addEventListener("click", exportMappingRules);
exportRulesButtonBottom.addEventListener("click", exportMappingRules);
sourceFileInput.addEventListener("change", handleSourceFileImport);
targetFileInput.addEventListener("change", handleTargetFileImport);
importRulesInput.addEventListener("change", importMappingRules);
window.addEventListener("resize", drawConnectionLines);
window.addEventListener("scroll", drawConnectionLines);
sourceFieldsList.addEventListener("scroll", drawConnectionLines);
targetFieldsList.addEventListener("scroll", drawConnectionLines);
document.addEventListener("DOMContentLoaded", () => {
    renderSavedMappings();
    renderStats();
});