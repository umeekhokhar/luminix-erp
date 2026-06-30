import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { crmAPI, adminAPI } from "../services/api";
import "../styles/Customers.css";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", address: "",
    city: "", country: "", company: "",
    create_user: false, username: "", password: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchCustomers();
  }, [navigate]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await crmAPI.getCustomers();
      setCustomers(response.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch customers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name, email: formData.email, phone: formData.phone,
        address: formData.address, city: formData.city,
        country: formData.country, company: formData.company,
      };

      if (editingId) {
        await crmAPI.updateCustomer(editingId, payload);
      } else if (formData.create_user) {
        const [firstName, ...rest] = (formData.name || "").split(" ");
        const lastName = rest.join(" ");
        const loginPayload = {
          username: formData.username, email: formData.email,
          password: formData.password, first_name: firstName,
          last_name: lastName, phone: formData.phone,
          address: formData.address, city: formData.city,
          country: formData.country,
        };
        await adminAPI.createCustomerWithLogin(loginPayload);
      } else {
        await crmAPI.createCustomer(payload);
      }

      await fetchCustomers();
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Failed to save customer"
      );
      console.error(err);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name || "", email: customer.email || "",
      phone: customer.phone || "", address: customer.address || "",
      city: customer.city || "", country: customer.country || "",
      company: customer.company || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await crmAPI.deleteCustomer(id);
      await fetchCustomers();
    } catch (err) {
      setError("Failed to delete customer");
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "", email: "", phone: "", address: "",
      city: "", country: "", company: "",
      create_user: false, username: "", password: "",
    });
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="lux-page-container">
      <div className="lux-page-header">
        <div className="header-title">
          <span className="title-icon">👥</span>
          <h1>Customers</h1>
        </div>
        {!showForm && (
          <button className="lux-btn primary" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
            + Add Customer
          </button>
        )}
      </div>

      {error && <div className="lux-error-banner">{error}</div>}

      {showForm && (
        <div className="lux-panel lux-form-panel">
          <form onSubmit={handleSubmit} className="lux-form">
            <h2>{editingId ? "Edit Customer" : "New Customer"}</h2>
            
            <div className="lux-form-row">
              <div className="lux-form-group">
                <label>Name *</label>
                <input type="text" className="lux-input" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="lux-form-group">
                <label>Email *</label>
                <input type="email" className="lux-input" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="lux-form-row">
              <div className="lux-form-group">
                <label>Phone *</label>
                <input type="text" className="lux-input" name="phone" value={formData.phone} onChange={handleInputChange} required />
              </div>
              <div className="lux-form-group">
                <label>Company</label>
                <input type="text" className="lux-input" name="company" value={formData.company} onChange={handleInputChange} />
              </div>
            </div>

            <div className="lux-form-row">
              <div className="lux-form-group">
                <label>Address</label>
                <input type="text" className="lux-input" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div className="lux-form-group">
                <label>City</label>
                <input type="text" className="lux-input" name="city" value={formData.city} onChange={handleInputChange} />
              </div>
            </div>

            <div className="lux-form-row">
              <div className="lux-form-group half">
                <label>Country</label>
                <input type="text" className="lux-input" name="country" value={formData.country} onChange={handleInputChange} />
              </div>
            </div>

            {!editingId && (
              <div className="lux-form-row">
                <div className="lux-form-group checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="create_user" checked={formData.create_user} onChange={handleInputChange} /> 
                    <span className="checkbox-custom"></span>
                    Create login portal for this customer
                  </label>
                </div>
              </div>
            )}

            {formData.create_user && !editingId && (
              <div className="lux-form-row highlight-box">
                <div className="lux-form-group">
                  <label>Portal Username *</label>
                  <input type="text" className="lux-input" name="username" value={formData.username} onChange={handleInputChange} required />
                </div>
                <div className="lux-form-group">
                  <label>Portal Password *</label>
                  <input type="password" className="lux-input" name="password" value={formData.password} onChange={handleInputChange} required />
                </div>
              </div>
            )}

            <div className="lux-form-actions">
            <button type="button" className="lux-btn ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
            <button type="submit" className="lux-btn primary">{editingId ? "Update Customer" : "Save Customer"}</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="lux-search-wrapper">
          <span className="search-icon">🔍</span>
          <input type="text" className="lux-search-input" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      )}

      {!showForm && loading ? (
        <div className="lux-loading-state"><div className="spinner"></div>Loading customers...</div>
      ) : !showForm && filteredCustomers.length === 0 ? (
        <div className="lux-empty-state">No customers found.</div>
      ) : !showForm && (
        <div className="lux-panel lux-table-wrapper">
          <table className="lux-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Company</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="cell-primary-text">{customer.name}</div>
                    <div className="cell-tertiary-text">ID: {customer.id?.toString().substring(0,8)}</div>
                  </td>
                  <td>
                    <div className="cell-secondary-text">{customer.email}</div>
                    <div className="cell-tertiary-text">{customer.phone}</div>
                  </td>
                  <td>
                    <div className="cell-secondary-text">{customer.city || "-"}</div>
                    <div className="cell-tertiary-text">{customer.country || "-"}</div>
                  </td>
                  <td><div className="lux-badge ghost-badge">{customer.company || "Individual"}</div></td>
                  <td className="text-right">
                    <div className="lux-action-group right-align">
                      <button className="lux-btn-icon ghost" onClick={() => handleEdit(customer)}>✏️</button>
                      <button className="lux-btn-icon danger" onClick={() => handleDelete(customer.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Customers;