# Data Mapper

A browser-based visual data-mapping tool for transforming source JSON/XML
data into target JSON structures using clickable or draggable field
connections.

## Live Links

- GitHub Repository: [fazal305/data-mapper](https://github.com/fazal305/data-mapper)
- Live Demo: [https://fazal305.github.io/data-mapper/](https://fazal305.github.io/data-mapper/)

## Overview

Data Mapper is a lightweight enterprise-style mapping workspace for developers
who need to transform source JSON or XML data into a different target JSON
shape. It extracts fields recursively, lets users create visual mapping rules,
and generates transformed JSON that can be copied, downloaded, or reused.

## Features

- Paste and parse source JSON data
- Paste and parse source XML data
- Paste and parse target JSON templates
- Import source `.json` and `.xml` files
- Import target `.json` template files
- Auto-detect source data type or manually choose JSON/XML
- Recursively extract nested source fields
- Recursively extract nested target fields
- Click-to-connect source and target fields
- Drag-and-drop source fields onto target fields
- Render visual SVG connection lines
- Replace mappings for already mapped target fields
- Remove mapping rules from the rules table
- Auto-map fields with similar names and aliases
- Generate transformed target JSON output
- Copy transformed output with the Clipboard API
- Download transformed output as `mapped-output.json`
- Save mapping rules in localStorage
- Load and delete saved mapping rule sets
- Export mapping rules as JSON
- Import compatible mapping rules from JSON
- Responsive cyberpunk developer-tool interface

## Technologies Used

- HTML5
- CSS3
- Bootstrap 5
- jQuery
- Vanilla JavaScript
- JSON.parse
- JSON.stringify
- DOMParser
- SVG
- FileReader API
- LocalStorage
- Blob API
- Clipboard API

## Learning Outcomes

- Build a browser-only developer tool without build tools or frameworks
- Parse and validate JSON input using `JSON.parse`
- Parse and convert XML input using `DOMParser`
- Traverse nested objects and arrays recursively
- Flatten source and target structures into field paths
- Create visual field mapping interactions
- Draw dynamic SVG connection paths between UI elements
- Read and write nested values using dot/bracket paths
- Generate transformed JSON from reusable mapping rules
- Persist browser data with localStorage
- Export JSON files using Blob and object URLs
- Handle local file imports with FileReader
- Design a responsive Bootstrap-based developer interface

## Folder Structure

```text
data-mapper/
  index.html
  styles.css
  script.js
  README.md
  LICENSE
  .gitignore
```
How To Run Locally
git clone https://github.com/fazal305/data-mapper.git
cd data-mapper
start index.html
You can also open index.html directly in any modern browser.
How To Use
Paste source JSON or XML into the Source Data editor.
Choose Auto Detect, JSON, or XML from the source type selector.
Paste a target JSON template into the Target Template editor.
Click Parse Data to extract source and target fields.
Select a source field, then click a target field to create a mapping.
Drag a source field onto a target field as an alternate mapping method.
Use Auto Map Similar Names to create common mappings quickly.
Review or remove mappings in the Mapping Rules table.
Click Generate Output to create transformed target JSON.
Copy or download the generated output.
Save mapping rules for browser persistence.
Export or import mapping rules as JSON files.
Sample Mapping
Source JSON:
{
  "fname": "Ali",
  "lname": "Raza"
}
Target JSON template:
{
  "firstName": "",
  "lastName": ""
}
Generated output:
{
  "firstName": "Ali",
  "lastName": "Raza"
}