-- CRM Database Schema
-- Enhanced schema strictly matching Oracle APEX CRM (CRM.COMPANY & CRM.CONTACT) metadata.
-- Includes all 33 Company columns and all 42 Contact columns, plus aliases for seamless frontend compatibility.

CREATE SEQUENCE IF NOT EXISTS companies_id_seq;

CREATE TABLE IF NOT EXISTS companies (
    id BIGINT PRIMARY KEY DEFAULT nextval('companies_id_seq'),
    -- Exact 33 Oracle CRM.COMPANY columns:
    comp_name VARCHAR(500),
    technology TEXT,
    country VARCHAR(150),
    existingcomp VARCHAR(50) DEFAULT 'N',
    companyphone VARCHAR(100),
    company_categories VARCHAR(255),
    company_type VARCHAR(100) DEFAULT 'Direct Client',
    registered_url VARCHAR(500),
    registration_status VARCHAR(100),
    supplier_number VARCHAR(100),
    username VARCHAR(100),
    password VARCHAR(255),
    registration_date VARCHAR(100),
    industry VARCHAR(255),
    city VARCHAR(150),
    website VARCHAR(500),
    da VARCHAR(100),
    com_email VARCHAR(255),
    remark TEXT,
    employee_size VARCHAR(100),
    created_by VARCHAR(100) DEFAULT 'system',
    created_date VARCHAR(100),
    modified_by VARCHAR(100) DEFAULT 'system',
    modified_date VARCHAR(100),
    salesperson VARCHAR(255),
    prev_salesperson VARCHAR(255),
    joget_id VARCHAR(100),
    contacts_count INTEGER DEFAULT 0,
    lead_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    source VARCHAR(255),
    normalized_website VARCHAR(4000),
    
    -- Aliases for backward compatibility:
    name VARCHAR(500),
    phone VARCHAR(100),
    email VARCHAR(255),
    existing_comp VARCHAR(50) DEFAULT 'N',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE companies_id_seq OWNED BY companies.id;

CREATE SEQUENCE IF NOT EXISTS contacts_id_seq;

CREATE TABLE IF NOT EXISTS contacts (
    id BIGINT PRIMARY KEY DEFAULT nextval('contacts_id_seq'),
    -- Exact 42 Oracle CRM.CONTACT columns:
    designation VARCHAR(255),
    pos_type VARCHAR(150),
    priority_contact VARCHAR(100),
    country VARCHAR(150),
    comp_email VARCHAR(255),
    other_email VARCHAR(255),
    comp_email_verified VARCHAR(100),
    contact_phone VARCHAR(250),
    contact_phone2 VARCHAR(100),
    contact_phone3 VARCHAR(100),
    contact_mobile VARCHAR(200),
    contact_mobile2 VARCHAR(200),
    contact_mobile3 VARCHAR(250),
    mobile_verified VARCHAR(50),
    linkedin_url VARCHAR(500),
    linkedlnid VARCHAR(200),
    comp_linkedlnid VARCHAR(200),
    preferred_linkedin_connected VARCHAR(500),
    linkedin_conn_send_acc VARCHAR(4000),
    connection_date VARCHAR(100),
    contactstatus VARCHAR(4000),
    salesperson VARCHAR(4000),
    source VARCHAR(255),
    data_extracted VARCHAR(100),
    remark TEXT,
    linkedin_cnnctd_acc VARCHAR(4000),
    current_past VARCHAR(100),
    email_tool_verified VARCHAR(100),
    email_verified_by_response VARCHAR(100),
    source_details VARCHAR(500),
    connection_send_by VARCHAR(255),
    website VARCHAR(500),
    created_by VARCHAR(100) DEFAULT 'system',
    created_date VARCHAR(100),
    modified_by VARCHAR(100) DEFAULT 'system',
    modified_date VARCHAR(100),
    industry VARCHAR(400),
    contact_name VARCHAR(400) NOT NULL,
    comp_name VARCHAR(500),
    comp_id BIGINT,
    technology VARCHAR(255),

    -- Additional / Backward compatible columns:
    company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    company_name VARCHAR(500),
    position_type VARCHAR(150),
    company_type VARCHAR(100) DEFAULT 'Direct Client',
    contact_status VARCHAR(4000),
    phone VARCHAR(250),
    phone2 VARCHAR(100),
    phone3 VARCHAR(100),
    mobile VARCHAR(200),
    mobile2 VARCHAR(200),
    mobile3 VARCHAR(250),
    email VARCHAR(255),
    email_verified VARCHAR(100),
    email_verified_response VARCHAR(100),
    linkedin_id VARCHAR(200),
    comp_linkedin_id VARCHAR(200),
    linkedin_connected_acc VARCHAR(4000),
    data_extracted_date VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE contacts_id_seq OWNED BY contacts.id;

-- Fast query and filtering indexes
CREATE INDEX IF NOT EXISTS idx_companies_comp_name ON companies(comp_name);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_technology ON companies(technology);

CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(contact_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(comp_email);
CREATE INDEX IF NOT EXISTS idx_contacts_comp_id ON contacts(comp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(contactstatus);

-- Duplicate Merger Audit & History Table
CREATE TABLE IF NOT EXISTS merge_history (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    master_id BIGINT NOT NULL,
    merged_ids BIGINT[] NOT NULL,
    master_name VARCHAR(500),
    merged_names TEXT[],
    match_rule VARCHAR(100),
    reassigned_contacts_count INT DEFAULT 0,
    reassigned_leads_count INT DEFAULT 0,
    reassigned_lead_contacts_count INT DEFAULT 0,
    field_changes JSONB,
    merged_by VARCHAR(100) DEFAULT 'admin',
    merged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_merge_history_entity ON merge_history(entity_type);
CREATE INDEX IF NOT EXISTS idx_merge_history_master ON merge_history(master_id);
