import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../services/api';
import '../styles/Customers.css';

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
        } else {
            fetchCategories();
        }
    }, [navigate]);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await inventoryAPI.getCategories();
            setCategories(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch categories');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await inventoryAPI.updateCategory(editingId, formData);
            } else {
                await inventoryAPI.createCategory(formData);
            }
            fetchCategories();
            setShowForm(false);
            setEditingId(null);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save category');
        }
    };

    const handleEdit = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            description: category.description || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await inventoryAPI.deleteCategory(id);
                fetchCategories();
            } catch (err) {
                setError('Failed to delete category');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
        });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        resetForm();
    };

    const filteredCategories = categories.filter((category) =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="customers-container">
            <div className="customers-header">
                <h1>Categories</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setShowForm(true);
                        setEditingId(null);
                        resetForm();
                    }}
                >
                    + Add Category
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showForm && (
                <div className="form-container">
                    <form onSubmit={handleSubmit} className="customers-form">
                        <h2>{editingId ? 'Edit Category' : 'New Category'}</h2>

                        <div className="form-group">
                            <label>Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="3"
                            ></textarea>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleCancel}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="search-filter">
                <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : filteredCategories.length === 0 ? (
                <div className="no-data">No categories found</div>
            ) : (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map((category) => (
                                <tr key={category.id}>
                                    <td>{category.name}</td>
                                    <td>{category.description || '-'}</td>
                                    <td>{new Date(category.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="btn-small"
                                            onClick={() => handleEdit(category)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn-small btn-danger"
                                            onClick={() => handleDelete(category.id)}
                                        >
                                            Delete
                                        </button>
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

export default Categories;
