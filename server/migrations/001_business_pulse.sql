-- Business Pulse: structured business database.
-- Original PDF = evidence (report_files, stored on disk and never deleted).
-- These tables = operational truth, every number traceable to a report + source line.

CREATE TABLE businesses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE report_files (
  id INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  sha256 TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  pages INTEGER,
  extraction_method TEXT,            -- 'text' | 'ocr' | NULL (not extracted)
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  uploaded_by TEXT,
  UNIQUE (business_id, sha256)
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  file_id INTEGER NOT NULL REFERENCES report_files(id),
  report_date TEXT,                  -- YYYY-MM-DD as printed on the report (project calendar date)
  currency TEXT,                     -- ISO code as detected on the report (USD, IQD, ...)
  status TEXT NOT NULL,              -- pending | approved | superseded | rejected
  validation TEXT NOT NULL,          -- VALID | NEEDS_REVIEW | FAILED
  error_code TEXT,                   -- for FAILED: PARSING_FAILED | UNSUPPORTED_PDF | ...
  error_message TEXT,
  -- values exactly as reported on the PDF (NULL = not present on the report)
  sales REAL, gross_profit REAL, expenses REAL, other_revenue REAL, net_profit REAL, units_sold REAL,
  business_label TEXT,               -- business name printed on the report header, if any
  report_notes TEXT,                 -- free-text notes section of the report
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  imported_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  superseded_by INTEGER REFERENCES reports(id),
  parse_meta TEXT                    -- JSON: layout diagnostics
);
CREATE INDEX reports_by_date ON reports(business_id, report_date);
-- Only one approved report per business/day/currency.
CREATE UNIQUE INDEX reports_one_approved ON reports(business_id, report_date, currency) WHERE status = 'approved';

CREATE TABLE report_fields (         -- lineage for each summary value
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  field TEXT NOT NULL,               -- date | currency | sales | gross_profit | expenses | other_revenue | net_profit | units_sold | business
  raw_text TEXT,
  value_num REAL,
  value_text TEXT,
  page INTEGER,
  line_no INTEGER,
  confidence TEXT NOT NULL DEFAULT 'ok'  -- ok | unclear
);
CREATE INDEX report_fields_by_report ON report_fields(report_id);

CREATE TABLE report_products (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  item_no TEXT,
  name TEXT NOT NULL,
  model TEXT, sku TEXT, brand TEXT, category TEXT,
  product_key TEXT NOT NULL,         -- sku | model | name, normalised
  quantity REAL, sales REAL, cost REAL, profit REAL,
  page INTEGER, line_no INTEGER, raw_text TEXT,
  confidence TEXT NOT NULL DEFAULT 'ok'
);
CREATE INDEX report_products_by_report ON report_products(report_id);
CREATE INDEX report_products_by_key ON report_products(product_key);

CREATE TABLE report_expenses (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT, amount REAL, ref TEXT, note TEXT,
  page INTEGER, line_no INTEGER, raw_text TEXT,
  confidence TEXT NOT NULL DEFAULT 'ok'
);
CREATE INDEX report_expenses_by_report ON report_expenses(report_id);

CREATE TABLE report_other_revenue (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  description TEXT NOT NULL, amount REAL, note TEXT,
  page INTEGER, line_no INTEGER, raw_text TEXT,
  confidence TEXT NOT NULL DEFAULT 'ok'
);

CREATE TABLE report_returns (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  description TEXT NOT NULL, quantity REAL, amount REAL, reason TEXT,
  page INTEGER, line_no INTEGER, raw_text TEXT
);

CREATE TABLE report_checks (         -- validation results: reported vs calculated
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL,              -- pass | fail | warn | skip
  field TEXT,
  reported REAL, calculated REAL, difference REAL,
  message TEXT NOT NULL
);
CREATE INDEX report_checks_by_report ON report_checks(report_id);

CREATE TABLE report_corrections (    -- explicit human edits made during review; originals kept
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,              -- report | product | expense | other_revenue
  entity_id INTEGER,
  field TEXT NOT NULL,
  old_value REAL, new_value REAL,
  reason TEXT,
  corrected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  corrected_by TEXT
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  entity_type TEXT NOT NULL,         -- report | date | product | alert | opportunity | task | expense
  entity_id TEXT,
  report_id INTEGER REFERENCES reports(id),
  note_date TEXT,
  body TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX notes_by_entity ON notes(business_id, entity_type, entity_id);

CREATE TABLE agent_tasks (
  id INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  agent TEXT NOT NULL,               -- analyst | operations | purchasing | growth | designer | researcher
  kind TEXT NOT NULL,                -- analyse | ops_review | reorder_review | campaign | creative | price_review
  title TEXT NOT NULL,
  origin TEXT NOT NULL,              -- business_pulse | agent:<id>
  origin_ref TEXT,                   -- JSON {type,id} of the alert/opportunity/product/report
  context TEXT NOT NULL,             -- JSON: the small payload the agent receives
  status TEXT NOT NULL,              -- queued | running | done | failed | blocked
  status_reason TEXT,
  result TEXT,
  parent_task_id INTEGER REFERENCES agent_tasks(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX agent_tasks_by_agent ON agent_tasks(business_id, agent, status);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  business_id INTEGER,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT
);
