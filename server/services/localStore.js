const fs = require('fs');
const path = require('path');

const companiesFile = path.join(__dirname, '..', 'data', 'companies_1000.json');
const contactsFile = path.join(__dirname, '..', 'data', 'contacts_1000.json');

let inMemoryCompanies = [];
let inMemoryContacts = [];

function normalizeCompany(c) {
  const id = c.ID || c.id;
  const name = c.COMP_NAME || c.name || 'Unnamed Company';
  return {
    ...c,
    id: parseInt(id, 10),
    name: name,
    comp_name: name,
    technology: c.TECHNOLOGY || c.technology || '',
    country: c.COUNTRY || c.country || '',
    existingcomp: c.EXISTINGCOMP || c.existing_comp || 'N',
    existing_comp: c.EXISTINGCOMP || c.existing_comp || 'N',
    companyphone: c.COMPANYPHONE || c.phone || '',
    phone: c.COMPANYPHONE || c.phone || '',
    company_categories: c.COMPANY_CATEGORIES || c.company_categories || '',
    company_type: c.COMPANY_TYPE || c.company_type || 'Direct Client',
    registered_url: c.REGISTERED_URL || c.registered_url || '',
    registration_status: c.REGISTRATION_STATUS || c.registration_status || '',
    supplier_number: c.SUPPLIER_NUMBER || c.supplier_number || '',
    username: c.USERNAME || c.username || '',
    password: c.PASSWORD || c.password || '',
    registration_date: c.REGISTRATION_DATE || c.registration_date || '',
    industry: c.INDUSTRY || c.industry || '',
    city: c.CITY || c.city || '',
    website: c.WEBSITE || c.website || '',
    da: c.DA || c.da || '',
    com_email: c.COM_EMAIL || c.email || '',
    email: c.COM_EMAIL || c.email || '',
    remark: c.REMARK || c.remarks || '',
    remarks: c.REMARK || c.remarks || '',
    employee_size: c.EMPLOYEE_SIZE || c.employee_size || '',
    created_by: c.CREATED_BY || c.created_by || 'system',
    created_date: c.CREATED_DATE || c.created_at || '',
    modified_by: c.MODIFIED_BY || c.modified_by || 'system',
    modified_date: c.MODIFIED_DATE || c.updated_at || '',
    salesperson: c.SALESPERSON || c.salesperson || '',
    prev_salesperson: c.PREV_SALESPERSON || c.prev_salesperson || '',
    joget_id: c.JOGET_ID || c.joget_id || '',
    contacts_count: c.CONTACTS_COUNT !== undefined ? parseInt(c.CONTACTS_COUNT, 10) : 0,
    lead_count: c.LEAD_COUNT !== undefined ? parseInt(c.LEAD_COUNT, 10) : 0,
    contact_count: c.CONTACT_COUNT !== undefined ? parseInt(c.CONTACT_COUNT, 10) : 0,
    source: c.SOURCE || c.source || '',
    normalized_website: c.NORMALIZED_WEBSITE || c.normalized_website || '',
  };
}

function normalizeContact(ct) {
  const id = ct.ID || ct.id;
  const contactName = ct.CONTACT_NAME || ct.contact_name || 'Unknown Contact';
  const compName = ct.COMP_NAME || ct.company_name || '';
  const compId = ct.COMP_ID || ct.company_id || null;
  return {
    ...ct,
    id: parseInt(id, 10),
    contact_name: contactName,
    comp_name: compName,
    company_name: compName,
    comp_id: compId ? parseInt(compId, 10) : null,
    company_id: compId ? parseInt(compId, 10) : null,
    designation: ct.DESIGNATION || ct.designation || '',
    pos_type: ct.POS_TYPE || ct.position_type || '',
    position_type: ct.POS_TYPE || ct.position_type || '',
    priority_contact: ct.PRIORITY_CONTACT || ct.priority_contact || '',
    country: ct.COUNTRY || ct.country || '',
    comp_email: ct.COMP_EMAIL || ct.email || '',
    email: ct.COMP_EMAIL || ct.email || '',
    other_email: ct.OTHER_EMAIL || ct.other_email || '',
    comp_email_verified: ct.COMP_EMAIL_VERIFIED || ct.email_verified || '',
    email_verified: ct.COMP_EMAIL_VERIFIED || ct.email_verified || '',
    contact_phone: ct.CONTACT_PHONE || ct.phone || '',
    phone: ct.CONTACT_PHONE || ct.phone || '',
    contact_phone2: ct.CONTACT_PHONE2 || ct.phone2 || '',
    phone2: ct.CONTACT_PHONE2 || ct.phone2 || '',
    contact_phone3: ct.CONTACT_PHONE3 || ct.phone3 || '',
    phone3: ct.CONTACT_PHONE3 || ct.phone3 || '',
    contact_mobile: ct.CONTACT_MOBILE || ct.mobile || '',
    mobile: ct.CONTACT_MOBILE || ct.mobile || '',
    contact_mobile2: ct.CONTACT_MOBILE2 || ct.mobile2 || '',
    mobile2: ct.CONTACT_MOBILE2 || ct.mobile2 || '',
    contact_mobile3: ct.CONTACT_MOBILE3 || ct.mobile3 || '',
    mobile3: ct.CONTACT_MOBILE3 || ct.mobile3 || '',
    mobile_verified: ct.MOBILE_VERIFIED || ct.mobile_verified || '',
    linkedin_url: ct.LINKEDIN_URL || ct.linkedin_url || '',
    linkedlnid: ct.LINKEDLNID || ct.linkedin_id || '',
    linkedin_id: ct.LINKEDLNID || ct.linkedin_id || '',
    comp_linkedlnid: ct.COMP_LINKEDLNID || ct.comp_linkedin_id || '',
    comp_linkedin_id: ct.COMP_LINKEDLNID || ct.comp_linkedin_id || '',
    preferred_linkedin_connected: ct.PREFERRED_LINKEDIN_CONNECTED || ct.preferred_linkedin_connected || '',
    linkedin_conn_send_acc: ct.LINKEDIN_CONN_SEND_ACC || ct.linkedin_conn_send_acc || '',
    connection_date: ct.CONNECTION_DATE || ct.connection_date || '',
    contactstatus: ct.CONTACTSTATUS || ct.contact_status || '',
    contact_status: ct.CONTACTSTATUS || ct.contact_status || '',
    salesperson: ct.SALESPERSON || ct.salesperson || '',
    source: ct.SOURCE || ct.source || '',
    data_extracted: ct.DATA_EXTRACTED || ct.data_extracted_date || '',
    data_extracted_date: ct.DATA_EXTRACTED || ct.data_extracted_date || '',
    remark: ct.REMARK || ct.remarks || '',
    remarks: ct.REMARK || ct.remarks || '',
    linkedin_cnnctd_acc: ct.LINKEDIN_CNNCTD_ACC || ct.linkedin_connected_acc || '',
    linkedin_connected_acc: ct.LINKEDIN_CNNCTD_ACC || ct.linkedin_connected_acc || '',
    current_past: ct.CURRENT_PAST || ct.current_past || '',
    email_tool_verified: ct.EMAIL_TOOL_VERIFIED || ct.email_tool_verified || '',
    email_verified_by_response: ct.EMAIL_VERIFIED_BY_RESPONSE || ct.email_verified_response || '',
    email_verified_response: ct.EMAIL_VERIFIED_BY_RESPONSE || ct.email_verified_response || '',
    source_details: ct.SOURCE_DETAILS || ct.source_details || '',
    connection_send_by: ct.CONNECTION_SEND_BY || ct.connection_send_by || '',
    website: ct.WEBSITE || ct.website || '',
    created_by: ct.CREATED_BY || ct.created_by || 'system',
    created_date: ct.CREATED_DATE || ct.created_at || '',
    modified_by: ct.MODIFIED_BY || ct.modified_by || 'system',
    modified_date: ct.MODIFIED_DATE || ct.updated_at || '',
    industry: ct.INDUSTRY || ct.industry || '',
    technology: ct.TECHNOLOGY || ct.technology || '',
  };
}

function loadData() {
  try {
    if (fs.existsSync(companiesFile)) {
      const raw = JSON.parse(fs.readFileSync(companiesFile, 'utf8'));
      inMemoryCompanies = raw.map(normalizeCompany);
    }
    if (fs.existsSync(contactsFile)) {
      const raw = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
      inMemoryContacts = raw.map(normalizeContact);
    }
  } catch (err) {
    console.error('[LocalStore Load Error]:', err.message);
  }
}

function saveData() {
  try {
    fs.writeFileSync(companiesFile, JSON.stringify(inMemoryCompanies, null, 2), 'utf8');
    fs.writeFileSync(contactsFile, JSON.stringify(inMemoryContacts, null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalStore Save Error]:', err.message);
  }
}

// Initial load
loadData();

// ==========================================
// COMPANIES CRUD
// ==========================================
function getCompanies({
  search = '',
  id_from = '',
  id_to = '',
  name = '',
  comp_name = '',
  industry = '',
  country = '',
  city = '',
  website = '',
  technology = '',
  company_type = '',
  company_categories = '',
  categories = '',
  lead_count = '',
  employee_size = '',
  contact_count = '',
  source = '',
  remark = '',
  registration_date = '',
  registration_status = '',
  supplier_number = '',
  created_from = '',
  created_to = '',
  modified_from = '',
  modified_to = '',
  created_by = '',
  phone = '',
  companyphone = '',
  sortBy = 'id',
  sortOrder = 'DESC',
  limit = 50,
  page = 1,
  offset = null,
} = {}) {
  // Map dynamic contact counts
  let list = inMemoryCompanies.map((c) => {
    const dynamicCount = inMemoryContacts.filter(
      (ct) => String(ct.company_id || ct.comp_id) === String(c.id)
    ).length;
    return {
      ...c,
      contact_count: dynamicCount,
      contacts_count: dynamicCount,
    };
  });

  // Global search
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((c) =>
      (c.comp_name || c.name || '').toLowerCase().includes(s) ||
      (c.industry || '').toLowerCase().includes(s) ||
      (c.technology || '').toLowerCase().includes(s) ||
      (c.company_type || '').toLowerCase().includes(s) ||
      (c.city || '').toLowerCase().includes(s) ||
      (c.country || '').toLowerCase().includes(s) ||
      (c.phone || c.companyphone || '').toLowerCase().includes(s) ||
      (c.email || c.com_email || '').toLowerCase().includes(s) ||
      String(c.id).includes(s)
    );
  }

  // ID Range
  if (id_from !== '' && !isNaN(parseInt(id_from, 10))) {
    list = list.filter((c) => c.id >= parseInt(id_from, 10));
  }
  if (id_to !== '' && !isNaN(parseInt(id_to, 10))) {
    list = list.filter((c) => c.id <= parseInt(id_to, 10));
  }

  // Company Name
  const targetName = (name || comp_name || '').trim().toLowerCase();
  if (targetName) {
    list = list.filter((c) => (c.comp_name || c.name || '').toLowerCase().includes(targetName));
  }

  // Technology
  if (technology && technology.trim()) {
    list = list.filter((c) => (c.technology || '').toLowerCase().includes(technology.trim().toLowerCase()));
  }

  // Company Type
  if (company_type && company_type.trim()) {
    list = list.filter((c) => (c.company_type || '').toLowerCase() === company_type.trim().toLowerCase());
  }

  // Categories
  const cat = (company_categories || categories || '').trim().toLowerCase();
  if (cat) {
    list = list.filter((c) => (c.company_categories || '').toLowerCase().includes(cat));
  }

  // Country
  if (country && country.trim()) {
    list = list.filter((c) => (c.country || '').toLowerCase() === country.trim().toLowerCase());
  }

  // City
  if (city && city.trim()) {
    list = list.filter((c) => (c.city || '').toLowerCase().includes(city.trim().toLowerCase()));
  }

  // Website
  if (website && website.trim()) {
    list = list.filter((c) => (c.website || '').toLowerCase().includes(website.trim().toLowerCase()));
  }

  // Lead Count
  if (lead_count !== '' && !isNaN(parseInt(lead_count, 10))) {
    list = list.filter((c) => c.lead_count === parseInt(lead_count, 10));
  }

  // Employee Size
  if (employee_size && employee_size.trim()) {
    list = list.filter((c) => (c.employee_size || '').toLowerCase() === employee_size.trim().toLowerCase());
  }

  // Contact Count (Dynamic filter)
  if (contact_count !== '' && !isNaN(parseInt(contact_count, 10))) {
    list = list.filter((c) => c.contact_count === parseInt(contact_count, 10));
  }

  // Source
  if (source && source.trim()) {
    list = list.filter((c) => (c.source || '').toLowerCase() === source.trim().toLowerCase());
  }

  // Industry
  if (industry && industry.trim()) {
    list = list.filter((c) => (c.industry || '').toLowerCase() === industry.trim().toLowerCase());
  }

  // Remark
  if (remark && remark.trim()) {
    list = list.filter((c) => (c.remark || c.remarks || '').toLowerCase().includes(remark.trim().toLowerCase()));
  }

  // Registration Status
  if (registration_status && registration_status.trim()) {
    list = list.filter((c) => (c.registration_status || '').toLowerCase() === registration_status.trim().toLowerCase());
  }

  // Supplier Number
  if (supplier_number && supplier_number.trim()) {
    list = list.filter((c) => (c.supplier_number || '').toLowerCase().includes(supplier_number.trim().toLowerCase()));
  }

  // Created By
  if (created_by && created_by.trim()) {
    list = list.filter((c) => (c.created_by || '').toLowerCase() === created_by.trim().toLowerCase());
  }

  // Company Phone
  const ph = (phone || companyphone || '').trim().toLowerCase();
  if (ph) {
    list = list.filter((c) => (c.companyphone || c.phone || '').toLowerCase().includes(ph));
  }

  // Sorting
  const isAsc = sortOrder.toUpperCase() === 'ASC';
  list.sort((a, b) => {
    let valA = a[sortBy] !== undefined ? a[sortBy] : a.id;
    let valB = b[sortBy] !== undefined ? b[sortBy] : b.id;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return isAsc ? valA - valB : valB - valA;
    }
    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();
    return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  const total = list.length;
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedOffset = offset !== null ? Math.max(0, parseInt(offset, 10)) : (parsedPage - 1) * parsedLimit;

  const data = list.slice(parsedOffset, parsedOffset + parsedLimit);

  return {
    data,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
  };
}

function getCompany(id) {
  const compId = parseInt(id, 10);
  const company = inMemoryCompanies.find((c) => c.id === compId);
  if (!company) return null;

  const contacts = inMemoryContacts.filter((ct) => ct.company_id === compId);
  return { ...company, contacts };
}

function createCompany(data) {
  const maxId = inMemoryCompanies.reduce((max, c) => Math.max(max, c.id || 0), 100000);
  const newCompany = {
    ...data,
    id: maxId + 1,
    contact_count: 0,
    lead_count: 0,
    created_at: new Date().toLocaleDateString('en-US'),
    updated_at: new Date().toLocaleDateString('en-US'),
  };
  inMemoryCompanies.unshift(newCompany);
  saveData();
  return newCompany;
}

function updateCompany(id, data) {
  const compId = parseInt(id, 10);
  const index = inMemoryCompanies.findIndex((c) => c.id === compId);
  if (index === -1) return null;

  inMemoryCompanies[index] = {
    ...inMemoryCompanies[index],
    ...data,
    id: compId,
    updated_at: new Date().toLocaleDateString('en-US'),
  };
  saveData();
  return inMemoryCompanies[index];
}

function deleteCompany(id) {
  const compId = parseInt(id, 10);
  const initialLen = inMemoryCompanies.length;
  inMemoryCompanies = inMemoryCompanies.filter((c) => c.id !== compId);
  // Clear company link from contacts safely
  inMemoryContacts.forEach((ct) => {
    if (ct.company_id === compId) {
      ct.company_id = null;
      ct.company_name = '';
    }
  });
  saveData();
  return inMemoryCompanies.length < initialLen;
}

function bulkDeleteCompanies(ids) {
  const idSet = new Set(ids.map((id) => parseInt(id, 10)));
  const initialLen = inMemoryCompanies.length;
  inMemoryCompanies = inMemoryCompanies.filter((c) => !idSet.has(c.id));
  inMemoryContacts.forEach((ct) => {
    if (ct.company_id && idSet.has(ct.company_id)) {
      ct.company_id = null;
      ct.company_name = '';
    }
  });
  saveData();
  return initialLen - inMemoryCompanies.length;
}

function getCompanyFilters() {
  const industries = Array.from(new Set(inMemoryCompanies.map((c) => c.industry).filter(Boolean))).sort();
  const countries = Array.from(new Set(inMemoryCompanies.map((c) => c.country).filter(Boolean))).sort();
  const technologies = Array.from(new Set(inMemoryCompanies.map((c) => c.technology).filter(Boolean))).sort();
  const companyTypes = Array.from(new Set(inMemoryCompanies.map((c) => c.company_type).filter(Boolean))).sort();
  const companyNames = Array.from(new Set(inMemoryCompanies.map((c) => c.comp_name || c.name).filter(Boolean))).sort();
  const categories = Array.from(new Set(inMemoryCompanies.map((c) => c.company_categories).filter(Boolean))).sort();
  const cities = Array.from(new Set(inMemoryCompanies.map((c) => c.city).filter(Boolean))).sort();
  const employeeSizes = Array.from(new Set(inMemoryCompanies.map((c) => c.employee_size).filter(Boolean))).sort();
  const sources = Array.from(new Set(inMemoryCompanies.map((c) => c.source).filter(Boolean))).sort();
  const registrationStatuses = Array.from(new Set(inMemoryCompanies.map((c) => c.registration_status).filter(Boolean))).sort();
  const supplierNumbers = Array.from(new Set(inMemoryCompanies.map((c) => c.supplier_number).filter(Boolean))).sort();
  const createdBys = Array.from(new Set(inMemoryCompanies.map((c) => c.created_by).filter(Boolean))).sort();
  const leadCounts = Array.from(new Set(inMemoryCompanies.map((c) => String(c.lead_count !== undefined ? c.lead_count : 0)))).sort();
  const remarks = Array.from(new Set(inMemoryCompanies.map((c) => c.remark || c.remarks).filter(Boolean))).sort();

  return {
    industries,
    countries,
    technologies,
    companyTypes,
    companyNames,
    categories,
    cities,
    employeeSizes,
    sources,
    registrationStatuses,
    supplierNumbers,
    createdBys,
    leadCounts,
    remarks,
  };
}

// ==========================================
// CONTACTS CRUD
// ==========================================
function getContacts({
  search = '',
  company_id = '',
  industry = '',
  country = '',
  position_type = '',
  contact_status = '',
  sortBy = 'id',
  sortOrder = 'DESC',
  limit = 50,
  page = 1,
  offset = null,
} = {}) {
  let list = [...inMemoryContacts];

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((ct) =>
      (ct.contact_name || '').toLowerCase().includes(s) ||
      (ct.company_name || '').toLowerCase().includes(s) ||
      (ct.designation || '').toLowerCase().includes(s) ||
      (ct.email || '').toLowerCase().includes(s) ||
      (ct.phone || '').includes(s) ||
      (ct.mobile || '').includes(s) ||
      String(ct.id).includes(s)
    );
  }

  if (company_id && String(company_id).trim()) {
    list = list.filter((ct) => String(ct.company_id) === String(company_id).trim());
  }
  if (position_type && position_type.trim()) {
    list = list.filter((ct) => (ct.position_type || '').toLowerCase() === position_type.trim().toLowerCase());
  }
  if (contact_status && contact_status.trim()) {
    list = list.filter((ct) => (ct.contact_status || '').toLowerCase() === contact_status.trim().toLowerCase());
  }
  if (industry && industry.trim()) {
    list = list.filter((ct) => (ct.industry || '').toLowerCase() === industry.trim().toLowerCase());
  }
  if (country && country.trim()) {
    list = list.filter((ct) => (ct.country || '').toLowerCase() === country.trim().toLowerCase());
  }

  const isAsc = sortOrder.toUpperCase() === 'ASC';
  list.sort((a, b) => {
    let valA = a[sortBy] !== undefined ? a[sortBy] : a.id;
    let valB = b[sortBy] !== undefined ? b[sortBy] : b.id;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return isAsc ? valA - valB : valB - valA;
    }
    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();
    return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  const total = list.length;
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedOffset = offset !== null ? Math.max(0, parseInt(offset, 10)) : (parsedPage - 1) * parsedLimit;

  const data = list.slice(parsedOffset, parsedOffset + parsedLimit);

  return {
    data,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
  };
}

function getContact(id) {
  const ctId = parseInt(id, 10);
  return inMemoryContacts.find((ct) => ct.id === ctId) || null;
}

function createContact(data) {
  const maxId = inMemoryContacts.reduce((max, ct) => Math.max(max, ct.id || 0), 100000);
  const newContact = {
    ...data,
    id: maxId + 1,
    created_at: new Date().toLocaleDateString('en-US'),
    updated_at: new Date().toLocaleDateString('en-US'),
  };
  inMemoryContacts.unshift(newContact);
  saveData();
  return newContact;
}

function updateContact(id, data) {
  const ctId = parseInt(id, 10);
  const index = inMemoryContacts.findIndex((ct) => ct.id === ctId);
  if (index === -1) return null;

  inMemoryContacts[index] = {
    ...inMemoryContacts[index],
    ...data,
    id: ctId,
    updated_at: new Date().toLocaleDateString('en-US'),
  };
  saveData();
  return inMemoryContacts[index];
}

function deleteContact(id) {
  const ctId = parseInt(id, 10);
  const initialLen = inMemoryContacts.length;
  inMemoryContacts = inMemoryContacts.filter((ct) => ct.id !== ctId);
  saveData();
  return inMemoryContacts.length < initialLen;
}

function bulkDeleteContacts(ids) {
  const idSet = new Set(ids.map((id) => parseInt(id, 10)));
  const initialLen = inMemoryContacts.length;
  inMemoryContacts = inMemoryContacts.filter((ct) => !idSet.has(ct.id));
  saveData();
  return initialLen - inMemoryContacts.length;
}

function getContactFilters() {
  const positionTypes = Array.from(new Set(inMemoryContacts.map((ct) => ct.position_type).filter(Boolean))).sort();
  const contactStatuses = Array.from(new Set(inMemoryContacts.map((ct) => ct.contact_status).filter(Boolean))).sort();
  const industries = Array.from(new Set(inMemoryContacts.map((ct) => ct.industry).filter(Boolean))).sort();
  const countries = Array.from(new Set(inMemoryContacts.map((ct) => ct.country).filter(Boolean))).sort();

  return { positionTypes, contactStatuses, industries, countries };
}

function getDashboardStats() {
  const totalCompanies = inMemoryCompanies.length;
  const totalContacts = inMemoryContacts.length;
  const assignedContacts = inMemoryContacts.filter((ct) => ct.company_id).length;
  const unassignedContacts = Math.max(0, totalContacts - assignedContacts);
  const recentCompanies = inMemoryCompanies.slice(0, 5);
  const recentContacts = inMemoryContacts.slice(0, 5);

  return {
    totalCompanies,
    totalContacts,
    assignedContacts,
    unassignedContacts,
    recentCompanies,
    recentContacts,
  };
}

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  bulkDeleteCompanies,
  getCompanyFilters,
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  getContactFilters,
  getDashboardStats,
  inMemoryCompanies,
  inMemoryContacts,
};

