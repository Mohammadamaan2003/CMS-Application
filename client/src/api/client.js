// Centralized API client for communicating with the Express backend

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Dashboard & Sync
  getDashboardStats: () => request('/dashboard/stats'),
  getDashboardAnalytics: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/analytics${qStr}`);
  },
  getDashboardFilterOptions: () => request('/dashboard/filter-options'),
  getLeadFilterOptions: () => request('/dashboard/lead/filter-options'),
  getLeadOverview: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/overview${qStr}`);
  },
  getLeadSalesPerformance: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/sales-performance${qStr}`);
  },
  getLeadTechnology: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/technology${qStr}`);
  },
  getLeadDetailsReport: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/details-report${qStr}`);
  },
  getLeadLinesReport: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/lines-report${qStr}`);
  },
  getLeadProposalsReport: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/proposals-report${qStr}`);
  },
  getLeadResourcesReport: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          if (val.length > 0) query.append(key, val.join(','));
        } else {
          query.append(key, val);
        }
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/lead/resources-report${qStr}`);
  },
  getSyncStatus: () => request('/sync/status'),
  triggerSync: (limit = 1000) => request(`/sync?limit=${limit}`, { method: 'POST' }),
  syncMasters: () => request('/sync/masters', { method: 'POST' }),

  // Companies
  getCompanies: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/companies${qStr}`);
  },
  getCompanyIds: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/companies/ids${qStr}`);
  },
  getCompanyFilters: () => request('/companies/filters'),
  getCompany: (id) => request(`/companies/${id}`),
  createCompany: (companyData) =>
    request('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    }),
  updateCompany: (id, companyData) =>
    request(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    }),
  deleteCompany: (id) =>
    request(`/companies/${id}`, {
      method: 'DELETE',
    }),
  bulkDeleteCompanies: (ids) =>
    request('/companies/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getCompanyUploadMeta: () => request('/companies/upload/meta'),
  validateCompanyUpload: (data) =>
    request('/companies/upload/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  importCompanyUpload: (data) =>
    request('/companies/upload/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Contacts
  getContacts: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/contacts${qStr}`);
  },
  getContactIds: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/contacts/ids${qStr}`);
  },
  getContactFilters: () => request('/contacts/filters'),
  getContact: (id) => request(`/contacts/${id}`),
  createContact: (contactData) =>
    request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    }),
  updateContact: (id, contactData) =>
    request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    }),
  deleteContact: (id) =>
    request(`/contacts/${id}`, {
      method: 'DELETE',
    }),
  bulkDeleteContacts: (ids) =>
    request('/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getContactUploadMeta: () => request('/contacts/upload/meta'),
  validateContactUpload: (data) =>
    request('/contacts/upload/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  importContactUpload: (data) =>
    request('/contacts/upload/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // CRM Upload & Incorrect Data Reports
  getUploadBatches: () => request('/crm-upload/batches'),
  getCompanyInvalidData: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/crm-upload/company-invalid-data${qStr}`);
  },
  deleteCompanyInvalidData: (id) =>
    request(`/crm-upload/company-invalid-data/${id}`, { method: 'DELETE' }),
  clearCompanyInvalidData: (ids = null) =>
    request('/crm-upload/company-invalid-data/clear', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }),
  retryCompanyInvalidData: (rows, mode = 'insert') =>
    request('/crm-upload/company-invalid-data/retry', {
      method: 'POST',
      body: JSON.stringify({ rows, mode }),
    }),

  getContactIncorrectData: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/crm-upload/contact-incorrect-data${qStr}`);
  },
  deleteContactIncorrectData: (id) =>
    request(`/crm-upload/contact-incorrect-data/${id}`, { method: 'DELETE' }),
  clearContactIncorrectData: (ids = null) =>
    request('/crm-upload/contact-incorrect-data/clear', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }),
  retryContactIncorrectData: (rows, mode = 'insert') =>
    request('/crm-upload/contact-incorrect-data/retry', {
      method: 'POST',
      body: JSON.stringify({ rows, mode }),
    }),

  // Masters - Company Size
  getCompanySizes: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/company-size${qStr}`);
  },
  getCompanySize: (id) => request(`/masters/company-size/${id}`),
  createCompanySize: (data) =>
    request('/masters/company-size', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCompanySize: (id, data) =>
    request(`/masters/company-size/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCompanySize: (id) =>
    request(`/masters/company-size/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteCompanySizes: (ids) =>
    request('/masters/company-size/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Masters - Company Type
  getCompanyTypes: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/company-type${qStr}`);
  },
  getCompanyType: (id) => request(`/masters/company-type/${id}`),
  createCompanyType: (data) =>
    request('/masters/company-type', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCompanyType: (id, data) =>
    request(`/masters/company-type/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCompanyType: (id) =>
    request(`/masters/company-type/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteCompanyTypes: (ids) =>
    request('/masters/company-type/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Masters - Company Categories
  getCompanyCategories: () => request('/masters/company-categories'),

  // Masters - Technologies
  getTechnologies: () => request('/masters/technologies'),

  // Masters - Country
  getCountries: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/country${qStr}`);
  },
  getCountry: (id) => request(`/masters/country/${id}`),
  createCountry: (data) =>
    request('/masters/country', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCountry: (id, data) =>
    request(`/masters/country/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCountry: (id) =>
    request(`/masters/country/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteCountries: (ids) =>
    request('/masters/country/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getCitiesByCountry: (country) => {
    if (!country) return Promise.resolve({ success: true, cities: [] });
    return request(`/masters/cities?country=${encodeURIComponent(country)}`);
  },

  // Masters - Country & City Mapping
  getCountryCityMappings: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.country) query.append('country', params.country);
    if (params.city) query.append('city', params.city);
    if (params.createdDate) query.append('createdDate', params.createdDate);
    if (params.modifiedDate) query.append('modifiedDate', params.modifiedDate);
    if (params.validationStatus) query.append('validationStatus', params.validationStatus);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/country-city-mapping${qStr}`);
  },
  getCountryCityFilterOptions: (country = '') => {
    const qStr = country ? `?country=${encodeURIComponent(country)}` : '';
    return request(`/masters/country-city-mapping/filter-options${qStr}`);
  },
  getCountryCityMapping: (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.country) query.append('country', params.country);
    if (params.city) query.append('city', params.city);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/country-city-mapping/${id}${qStr}`);
  },
  createCountryCityMapping: (data) =>
    request('/masters/country-city-mapping', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCountryCityMapping: (id, data) =>
    request(`/masters/country-city-mapping/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCountryCityMapping: (id) =>
    request(`/masters/country-city-mapping/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteCountryCityMappings: (ids) =>
    request('/masters/country-city-mapping/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Designation & Position Master
  getDesignationPositions: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/designation-position${qStr}`);
  },
  getDesignationPositionFilters: () => request('/masters/designation-position/filter-options'),
  getDesignationPosition: (id) => request(`/masters/designation-position/${id}`),
  getDesignationPositionContacts: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/designation-position/${id}/contacts${qStr}`);
  },
  createDesignationPosition: (data) =>
    request('/masters/designation-position', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDesignationPosition: (id, data) =>
    request(`/masters/designation-position/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDesignationPosition: (id) =>
    request(`/masters/designation-position/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteDesignationPositions: (ids) =>
    request('/masters/designation-position/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Industry Master
  getIndustries: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/industry${qStr}`);
  },
  getIndustryFilters: () => request('/masters/industry/filter-options'),
  getIndustry: (id) => request(`/masters/industry/${id}`),
  getIndustryCompanies: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/industry/${id}/companies${qStr}`);
  },
  createIndustry: (data) =>
    request('/masters/industry', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIndustry: (id, data) =>
    request(`/masters/industry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteIndustry: (id) =>
    request(`/masters/industry/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteIndustries: (ids) =>
    request('/masters/industry/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // LinkedIn Accounts & Countries Master
  getLinkedinAccounts: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/linkedin-accounts${qStr}`);
  },
  getLinkedinAccount: (id) => request(`/masters/linkedin-accounts/${id}`),
  getLinkedinAccountContacts: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/linkedin-accounts/${id}/contacts${qStr}`);
  },
  createLinkedinAccount: (data) =>
    request('/masters/linkedin-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLinkedinAccount: (id, data) =>
    request(`/masters/linkedin-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLinkedinAccount: (id) =>
    request(`/masters/linkedin-accounts/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteLinkedinAccounts: (ids) =>
    request('/masters/linkedin-accounts/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Position Type Master
  getPositionTypes: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/position-type${qStr}`);
  },
  getPositionTypeOptions: () => request('/masters/position-type/options'),
  getPositionType: (id) => request(`/masters/position-type/${id}`),
  getPositionTypeContacts: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/position-type/${id}/contacts${qStr}`);
  },
  createPositionType: (data) =>
    request('/masters/position-type', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePositionType: (id, data) =>
    request(`/masters/position-type/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updatePositionTypeRecords: (id, data) =>
    request(`/masters/position-type/${id}/update-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deletePositionType: (id) =>
    request(`/masters/position-type/${id}`, {
      method: 'DELETE',
    }),
  batchDeletePositionTypes: (ids) =>
    request('/masters/position-type/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Sales Person Master
  getSalespersons: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/sales-person${qStr}`);
  },
  getSalesperson: (id) => request(`/masters/sales-person/${id}`),
  getSalespersonContacts: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/sales-person/${id}/contacts${qStr}`);
  },
  createSalesperson: (data) =>
    request('/masters/sales-person', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSalesperson: (id, data) =>
    request(`/masters/sales-person/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSalesperson: (id) =>
    request(`/masters/sales-person/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteSalespersons: (ids) =>
    request('/masters/sales-person/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Sales Person Emails
  getSalespersonEmails: (salespersonId, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/sales-person/${salespersonId}/emails${qStr}`);
  },
  getSalespersonEmail: (emailId) => request(`/masters/sales-person-emails/${emailId}`),
  createSalespersonEmail: (salespersonId, data) =>
    request(`/masters/sales-person/${salespersonId}/emails`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSalespersonEmail: (emailId, data) =>
    request(`/masters/sales-person-emails/${emailId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSalespersonEmail: (emailId) =>
    request(`/masters/sales-person-emails/${emailId}`, {
      method: 'DELETE',
    }),

  // Source Master
  getSources: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/source${qStr}`);
  },
  getSourceOptions: () => request('/masters/source/options'),
  getSource: (id) => request(`/masters/source/${id}`),
  getSourceContacts: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/source/${id}/contacts${qStr}`);
  },
  createSource: (data) =>
    request('/masters/source', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSource: (id, data) =>
    request(`/masters/source/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateSourceRecords: (id, data) =>
    request(`/masters/source/${id}/update-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSource: (id) =>
    request(`/masters/source/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteSources: (ids) =>
    request('/masters/source/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Technology Master
  getTechnologiesMaster: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/technology${qStr}`);
  },
  getTechnologyFilterOptions: () => request('/masters/technology/filter-options'),
  getTechnologyMaster: (id) => request(`/masters/technology/${id}`),
  getTechnologyCompanies: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/technology/${id}/companies${qStr}`);
  },
  createTechnologyMaster: (data) =>
    request('/masters/technology', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTechnologyMaster: (id, data) =>
    request(`/masters/technology/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateTechnologyRecords: (id, data) =>
    request(`/masters/technology/${id}/update-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTechnologyMaster: (id) =>
    request(`/masters/technology/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteTechnologies: (ids) =>
    request('/masters/technology/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Lead Source Master
  getLeadSources: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/lead-source${qStr}`);
  },
  getLeadSource: (id) => request(`/masters/lead-source/${id}`),
  getLeadSourceCompanies: (id, params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/masters/lead-source/${id}/companies${qStr}`);
  },
  createLeadSource: (data) =>
    request('/masters/lead-source', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeadSource: (id, data) =>
    request(`/masters/lead-source/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateLeadSourceRecords: (id, data) =>
    request(`/masters/lead-source/${id}/update-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteLeadSource: (id) =>
    request(`/masters/lead-source/${id}`, {
      method: 'DELETE',
    }),
  batchDeleteLeadSources: (ids) =>
    request('/masters/lead-source/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getGenericMaster: (masterKey) => request(`/masters/generic/${masterKey}`),

  // Leads
  getLeads: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/leads${qStr}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  getLeadLovs: () => request('/leads/meta/lovs'),
  getLeadColumnValues: (column) => request(`/leads/meta/column-values?column=${encodeURIComponent(column)}`),
  createLead: (data) =>
    request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLead: (id, data) =>
    request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLead: (id) =>
    request(`/leads/${id}`, {
      method: 'DELETE',
    }),
  changeLeadAccountManager: (leadIds, accountManager) =>
    request('/leads/change-account-manager', {
      method: 'POST',
      body: JSON.stringify({ leadIds, accountManager }),
    }),

  // Lead Lines
  getLeadLines: (leadId) => request(`/leads/${leadId}/lines`),
  createLeadLine: (leadId, data) =>
    request(`/leads/${leadId}/lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeadLine: (lineId, data) =>
    request(`/leads/lines/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLeadLine: (lineId) =>
    request(`/leads/lines/${lineId}`, {
      method: 'DELETE',
    }),

  // Lead Contacts
  getLeadContacts: (leadId) => request(`/leads/${leadId}/contacts`),
  createLeadContact: (leadId, data) =>
    request(`/leads/${leadId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeadContact: (leadContactId, data) =>
    request(`/leads/contacts/${leadContactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLeadContact: (leadContactId) =>
    request(`/leads/contacts/${leadContactId}`, {
      method: 'DELETE',
    }),

  // Naukri Ads
  getLeadNaukriAds: (leadId) => request(`/leads/${leadId}/naukri-ads`),
  createLeadNaukriAd: (leadId, data) =>
    request(`/leads/${leadId}/naukri-ads`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeadNaukriAd: (adId, data) =>
    request(`/leads/naukri-ads/${adId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLeadNaukriAd: (adId) =>
    request(`/leads/naukri-ads/${adId}`, {
      method: 'DELETE',
    }),

  // Proposals
  getLeadProposals: (leadId) => request(`/leads/${leadId}/proposals`),
  createLeadProposal: (leadId, data) =>
    request(`/leads/${leadId}/proposals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLeadProposal: (propId, data) =>
    request(`/leads/proposals/${propId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLeadProposal: (propId) =>
    request(`/leads/proposals/${propId}`, {
      method: 'DELETE',
    }),

  // Resources
  getLeadResources: (leadId, lineId = null) => {
    const q = lineId ? `?lineId=${lineId}` : '';
    return request(`/leads/${leadId}/resources${q}`);
  },
  createLeadResource: (leadId, data) =>
    request(`/leads/${leadId}/resources`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteLeadResource: (resourceId) =>
    request(`/leads/resources/${resourceId}`, {
      method: 'DELETE',
    }),

  // Duplicate Merger
  getCompanyDuplicateCandidates: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/duplicate-merger/companies/candidates${qStr}`);
  },
  previewCompanyMerge: (payload) =>
    request('/duplicate-merger/companies/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  executeCompanyMerge: (payload) =>
    request('/duplicate-merger/companies/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getContactDuplicateCandidates: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/duplicate-merger/contacts/candidates${qStr}`);
  },
  previewContactMerge: (payload) =>
    request('/duplicate-merger/contacts/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  executeContactMerge: (payload) =>
    request('/duplicate-merger/contacts/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMergeHistory: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/duplicate-merger/history${qStr}`);
  },

  // User Management
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return request(`/users${qStr}`);
  },
  getUserSummary: () => request('/users/roles/summary'),
  getUser: (id) => request(`/users/${id}`),
  createUser: (payload) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleUserLogin: (id, can_login) =>
    request(`/users/${id}/toggle-login`, {
      method: 'PATCH',
      body: JSON.stringify({ can_login }),
    }),
  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),
};
