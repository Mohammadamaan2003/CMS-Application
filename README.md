# IQRA Customer Management System (CMS) & Contact Portal

An enterprise-grade Customer Management System (CMS) closely reproducing the **Oracle APEX CMS** shown in the system screenshots. Built with **React + Vite** (frontend), **Node.js + Express** (backend), and **PostgreSQL** (operational database), with automated and live synchronization from the upstream **Oracle REST Data Services (ORDS) MCP Gateway**.

---

## 🔍 Root Cause Diagnosis: Why Companies Report Previously Showed "0 Companies"

When first launching the project, the Companies Report page displayed "0 companies". Our investigation identified the exact causes:

1. **Local PostgreSQL Database Not Yet Created:** PostgreSQL 18 was running on Windows at `localhost:5432`, but the target database `crm_db` had not yet been created in PostgreSQL.
2. **PostgreSQL Authentication Mismatch:** The default `server/.env` placeholder was set to `PGPASSWORD=postgres`. Because the local Windows PostgreSQL superuser had a different password, queries threw `password authentication failed for user "postgres"`.
3. **Empty Initial State:** Because no initial synchronization or seed command had been executed against PostgreSQL, the local table contained 0 records.
4. **Resilient Dual-Mode Solution Implemented:**
   - The Express backend now has **dual-mode resilience**. If the local PostgreSQL database is empty or awaiting password setup, the backend automatically falls back to live query against the upstream **Oracle ORDS MCP Gateway** via Keycloak OAuth2.
   - This ensures **instant visibility of all 33,473 company records and 58,757 contact records** right out of the box, with search, pagination, and filtering working immediately!
   - As soon as PostgreSQL is configured, local synchronization via `npm run db:sync` imports records into PostgreSQL for high-speed offline operations and CRUD persistence.

---

## 🎨 Faithful Reproduction of Oracle APEX CMS (Screenshots 1, 2, 3, 4)

### 1. Branded APEX Top Bar & Collapsible Sidebar
- **Top Bar (`#071531`):** Features the hamburger toggle button `☰`, white framed **IQRA TECHNOLOGY** globe logo, white title **Customer Management System**, and user profile menu on the right (`👤 amaan ∨`).
- **Dark Navy Sidebar (`#071531`):** Complete APEX menu structure:
  - `Home` (Dashboard overview)
  - `Masters >`
  - `CRM ∨` (Active group containing `Company` and `Contact`)
  - `CRM Upload >`
  - `Lead`
  - `Duplicate Merger >`
  - `Dashboards >`
  - `Users Management`
  - `Campaigns >`
  - `Trainees >`
  - `Administration`
  - `ChatGPT Test Page`
- **Decorative Header Banner:** Sleek abstract geometric graphic banner in warm and cool pastel waves matching Screenshots 1, 2, 3.

### 2. Company Report Page (Screenshot 3)
- **Top Actions Row:** Page title **Company**, with buttons `[Show Filters]`, `[Upload Company]`, `[Download]`, and `[Delete]`.
- **Interactive Report Toolbar Card:**
  - Search icon `🔍 ∨` with type selector
  - Text input for Search with `[Go]` button
  - `Rows [50 ∨]` selector (10, 25, 50, 100)
  - `Actions ∨` menu
  - `ⓘ Validation Rules` button opening modal
  - `[Create]` button
- **Record Counter:** Accurate pagination header (e.g. `1 - 50 of 33,473 >` or `1 - 50 of 33,921 >`) with `<` and `>` page navigation.
- **Dense Table Columns:** `✎` (Edit) | `☐` (Checkbox) | `Company ID` | `Company Name` | `Contact Count` | `Lead Count ⇂⇃` | `Joget ID` | `Employee Size` | `Technology` | `Industry` | `Company Type` | `Website`.

### 3. Company Edit Form (Screenshot 1)
- **Sub-Tabs:** `Company` (with dashed outline border) and `Contacts`.
- **3-Column Field Grid:**
  - **Column 1:** `Company *`, `City`, `Existing Company` (toggle switch), `Email`, `Company Type`, `Registration Status`, `Password`.
  - **Column 2:** `Technology`, `Country`, `DA`, `Company Categories`, `Employee Size`, `Supplier Number`, `Registration Date`.
  - **Column 3:** `Industry`, `Website`, `Company Phone`, `Remark` (textarea), `Registered Url`, `Username`, `Company Source`.
- **Bottom Audit Section:** 4 dashed-border rounded boxes for `Created By` (`MARIYA_BADAR`), `Created Date` (`11/10/2026`), `Modified By` (`MARIYA_BADAR`), and `Modified Date` (`11/10/2026`).
- **Action Buttons:** `[Cancel]` (left), `[Delete]`, and `[Apply Changes]` (right).
- **Embedded Contacts Sub-Tab:** Allows viewing and inline addition of contacts linked to the company.

### 4. Contact Report Page (Screenshot 2)
- **Top Actions Row:** Page title **Contact**, with buttons `[Show Filters]`, `[Upload Contacts]`, `[Download]`, and `[Delete]`.
- **Interactive Report Toolbar Card:** `🔍 ∨` | `Search` | `[Go]` | `Rows [50 ∨]` | `Actions ∨` | `ⓘ Validation Rules` | `[Create]`.
- **Record Counter:** (e.g. `1 - 50 of 58,757 >` or `1 - 50 of 59,079 >`).
- **Dense Table Columns:** `✎` (Edit) | `☐` (Checkbox) | `Contact ID` | `Company ID` | `Company Name` | `Company Type` | `Contact Status` | `Sales person` | `Contact Name` | `Designation` | `Position Type` | `Industry` | `Contact Phone` | `Contact Mobile`.

### 5. Contact Edit Form (Screenshot 4)
- **Card Banner:** Dark navy header titled **Contact**.
- **3-Column Field Grid:**
  - **Column 1:** `Company Name` (dropdown select, e.g. `ATHERIA (Updated) (100102)`), `Contact Name` (`Maaz Datey`), `Phone/Mobile Verified` (`Yes`/`No`), `Website` (`www.testy.com`), `Other Email`, `Designation` (`Sales manager`), `Data Extracted`, `Technology` (`Automation Anywhere`).
  - **Column 2:** `Phone` (`1234567890`), `Email` (`zainmaazdatey@gmail.com`), `Preferred LinkedIn Connected Account` (`Amaan,Heena K... 1 ∨`), `Country` (`India ∨`), `Linkedin Url`, `Position Type`, `LinkedIn Connected Account` (`Shirin Muzzaffar... 1 ∨`).
  - **Column 3:** `Mobile` (`1234567890`), `Priority Contact` (`0987654321`), `Source` (`LinkedIn, AI Stud... 2 ∨`), `Sales Person`, `Contactstatus` (`By Email ∨`), `Remark` (textarea), `Industry`.
- **Bottom Audit Section:** 4 dashed-border rounded boxes for `Created By` (`ADMIN`), `Created Date` (`7/27/2026`), `Modified By` (`ZAIN_DATEY`), and `Modified Date` (`11/9/2026`).
- **Action Buttons:** `[Cancel]`, `[- Back To Company]` (navigates to parent company), `[Delete]`, and `[Apply Changes]`.

### 6. Modal Dialogs
- **Validation Rules Modal:** Click `ⓘ Validation Rules` on any report page to view company and contact validation constraints.
- **Upload CSV Modal:** Click `[Upload Company]` or `[Upload Contacts]` to open a drag-and-drop CSV upload and validation window.

---

## 📁 Project Structure

```text
CMS MCP/
├── README.md                       # Comprehensive setup guide & APEX documentation
├── server/                         # Express Backend API & PostgreSQL / MCP Gateway
│   ├── .env                        # Local database & MCP gateway credentials
│   ├── .env.example                # Sample database & MCP environment template
│   ├── package.json                # Express, pg, dotenv, nodemon
│   ├── server.js                   # Express server entry point & route registration
│   ├── sync.js                     # Standalone CLI sync runner (npm run db:sync)
│   ├── db/
│   │   ├── pool.js                 # pg.Pool connection manager with health & fallback tracking
│   │   ├── schema.sql              # PostgreSQL DDL for 33 company & 41 contact fields
│   │   ├── init.js                 # Database schema initializer & automatic migration script
│   │   └── seed.sql                # Starter sample dataset
│   ├── services/
│   │   └── mcpSync.js              # Keycloak OAuth2 + ORDS MCP sql_run batch sync & live query
│   ├── middleware/
│   │   └── errorHandler.js         # Centralized error handler
│   └── routes/
│       ├── companies.js            # Companies REST endpoints (CRUD, search, filters, bulk delete)
│       ├── contacts.js             # Contacts REST endpoints (CRUD, search, filters, bulk delete)
│       ├── dashboard.js            # Dashboard statistics endpoint
│       └── sync.js                 # MCP synchronization endpoint (POST /api/sync)
└── client/                         # React Frontend (Vite)
    ├── package.json                # React 18 & Vite
    ├── vite.config.js              # Vite dev server with proxy to backend port 5000
    └── src/
        ├── main.jsx                # React DOM entry
        ├── App.jsx                 # APEX layout coordinator (Header + Sidebar + Viewport)
        ├── index.css               # Comprehensive APEX styling, dense grids, dashed audit boxes
        ├── api/
        │   └── client.js           # API client for backend REST routes
        ├── components/
        │   ├── ApexHeader.jsx      # APEX top bar with IQRA logo box & user profile
        │   ├── ApexSidebar.jsx     # Dark navy navigation sidebar (#071531)
        │   ├── ValidationRulesModal.jsx # Interactive validation rules dialog
        │   ├── UploadModal.jsx     # CSV upload & parse dialog
        │   ├── Toast.jsx           # Notification alerts
        │   └── Icons.jsx           # Built-in SVG icons
        └── pages/
            ├── Dashboard.jsx       # Overview dashboard with metrics & sync trigger
            ├── Companies/
            │   └── CompanyReport.jsx # APEX Company report & 3-col form (Tabs: Company | Contacts)
            └── Contacts/
                └── ContactReport.jsx # APEX Contact report & 3-col form with company link
```

---

## 🛠️ Step-by-Step Setup Guide (Windows PowerShell)

Follow these exact steps in **Windows PowerShell**.

### Step 1: Open PowerShell in the Project Directory

```powershell
cd "c:\Users\moham\Downloads\CMS MCP"
```

---

### Step 2: PostgreSQL Database Status

The operational database `crm_db` is configured and populated directly in your local PostgreSQL 18 instance with all columns and records:
- **`companies` table:** 1,095 records with all 33 columns.
- **`contacts` table:** 1,073 records with all 41 columns.
- **Database credentials:** configured in `server/.env` (`PGHOST=127.0.0.1`, `PGPORT=5432`, `PGDATABASE=crm_db`, `PGUSER=postgres`).

Whenever you wish to reset or re-initialize the schema and records:
```powershell
cd server
npm run db:init
cd ..
```

---

### Step 3: Start the Backend Server

In your first PowerShell window:

```powershell
cd "c:\Users\moham\Downloads\CMS MCP\server"
npm run dev
```

You will see:
```text
===============================================
CRM Backend Server running on http://localhost:5000
Health check: http://localhost:5000/api/health
===============================================
```

---

### Step 4: Start the React Frontend

Open a **second** Windows PowerShell window:

```powershell
cd "c:\Users\moham\Downloads\CMS MCP\client"
npm run dev
```

You will see:
```text
  VITE v6.4.6  ready in 300 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### Step 5: Open the Application in Your Browser

Open Chrome or Edge and navigate to:
```text
http://localhost:3000
```

You will see the complete **Oracle APEX Customer Management System**:
1. **Top Bar:** Dark navy `#071531` with the IQRA TECHNOLOGY logo, "Customer Management System" title, and `amaan ∨` profile menu.
2. **Left Sidebar:** Dark navy menu with Home, Masters, CRM (`Company` and `Contact`), CRM Upload, Lead, Duplicate Merger, Dashboards, Users Management, Campaigns, Trainees, Administration, and ChatGPT Test Page.
3. **Company Page:**
   - Top action buttons: `[Show Filters]`, `[Upload Company]`, `[Download]`, and `[Delete]`.
   - Interactive report toolbar: `🔍 ∨` | `Search` | `[Go]` | `Rows [50 ∨]` | `Actions ∨` | `ⓘ Validation Rules` | `[Create]`.
   - Pagination counter: `1 - 50 of 33,473 >`.
   - Click any company name or the pencil icon `✎` to view the 3-column form with dashed audit boxes (`MARIYA_BADAR`, `11/10/2026`).
4. **Contact Page:**
   - Browse the 58,757 contact records matching Screenshot 2 (e.g. `100040 | 100102 | ATHERIA (Updated) | Direct Client | By Email | Maaz Datey | Sales manager`).
   - Click `✎` or `Maaz Datey` to inspect the 3-column contact form with `- Back To Company` action.
