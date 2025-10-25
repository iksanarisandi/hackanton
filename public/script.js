const API_URL = window.location.origin;
let token = localStorage.getItem('token');
let currentPage = 1;
let currentIdeaId = null;
let currentDeleteCallback = null;

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notification-icon');
    const messageEl = document.getElementById('notification-message');
    
    messageEl.textContent = message;
    
    // Set icon and color based on type
    if (type === 'success') {
        icon.classList.add('text-green-500');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
    } else if (type === 'error') {
        icon.classList.add('text-red-500');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />';
    } else {
        icon.classList.add('text-blue-500');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }
    
    notification.classList.remove('hidden');
    notification.classList.add('notification-enter');
    
    setTimeout(() => {
        closeNotification();
    }, 3000);
}

function closeNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('notification-enter');
    notification.classList.add('notification-exit');
    
    setTimeout(() => {
        notification.classList.add('hidden');
        notification.classList.remove('notification-exit');
    }, 300);
}

// Confirmation Modal
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    
    messageEl.textContent = message;
    currentDeleteCallback = onConfirm;
    modal.classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    currentDeleteCallback = null;
}

document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirmModal);

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (currentDeleteCallback) {
        await currentDeleteCallback();
        closeConfirmModal();
    }
});

// Set Active Navigation
function setActiveNav(page) {
    const dashboardBtn = document.getElementById('nav-dashboard');
    const statsBtn = document.getElementById('nav-stats');
    
    if (page === 'dashboard') {
        dashboardBtn.classList.add('bg-blue-500', 'text-white');
        dashboardBtn.classList.remove('text-gray-700', 'hover:text-blue-500');
        statsBtn.classList.remove('bg-blue-500', 'text-white');
        statsBtn.classList.add('text-gray-700', 'hover:text-blue-500');
    } else if (page === 'stats') {
        statsBtn.classList.add('bg-blue-500', 'text-white');
        statsBtn.classList.remove('text-gray-700', 'hover:text-blue-500');
        dashboardBtn.classList.remove('bg-blue-500', 'text-white');
        dashboardBtn.classList.add('text-gray-700', 'hover:text-blue-500');
    }
}

// Auth Tab Switching
document.getElementById('login-tab').addEventListener('click', () => {
    document.getElementById('login-tab').classList.add('border-b-2', 'border-blue-500', 'text-blue-500');
    document.getElementById('login-tab').classList.remove('text-gray-500');
    document.getElementById('register-tab').classList.remove('border-b-2', 'border-blue-500', 'text-blue-500');
    document.getElementById('register-tab').classList.add('text-gray-500');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('auth-error').classList.add('hidden');
});

document.getElementById('register-tab').addEventListener('click', () => {
    document.getElementById('register-tab').classList.add('border-b-2', 'border-blue-500', 'text-blue-500');
    document.getElementById('register-tab').classList.remove('text-gray-500');
    document.getElementById('login-tab').classList.remove('border-b-2', 'border-blue-500', 'text-blue-500');
    document.getElementById('login-tab').classList.add('text-gray-500');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('auth-error').classList.add('hidden');
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', data.user.email);
        showApp();
    } catch (error) {
        showAuthError('Login gagal. Silakan coba lagi.');
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', data.user.email);
        showApp();
    } catch (error) {
        showAuthError('Registrasi gagal. Silakan coba lagi.');
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    token = null;
    location.reload();
});

// Navigation
document.getElementById('nav-dashboard').addEventListener('click', () => {
    document.getElementById('dashboard-page').classList.remove('hidden');
    document.getElementById('stats-page').classList.add('hidden');
    setActiveNav('dashboard');
    loadIdeas();
});

document.getElementById('nav-stats').addEventListener('click', () => {
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('stats-page').classList.remove('hidden');
    setActiveNav('stats');
    loadStats();
});

// Show Auth Error
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Show App
function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    document.getElementById('user-email').textContent = localStorage.getItem('userEmail');
    setActiveNav('dashboard');
    loadIdeas();
}

// Check Auth on Load
if (token) {
    showApp();
}

// Load Ideas
async function loadIdeas(page = 1) {
    const search = document.getElementById('search-input').value;
    const status = document.getElementById('status-filter').value;
    const tag = document.getElementById('tag-filter').value;

    let url = `${API_URL}/api/ideas?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            showNotification('Gagal memuat ide', 'error');
            return;
        }

        displayIdeas(data.ideas);
        displayPagination(data.pagination);
        currentPage = page;
    } catch (error) {
        showNotification('Gagal memuat ide', 'error');
    }
}

// Display Ideas
function displayIdeas(ideas) {
    const container = document.getElementById('ideas-list');
    
    if (ideas.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-500">Belum ada ide. Tambahkan ide pertama Anda!</div>';
        return;
    }

    container.innerHTML = ideas.map(idea => {
        const statusColors = {
            'draft': 'bg-gray-200 text-gray-800',
            'in_progress': 'bg-blue-200 text-blue-800',
            'ready': 'bg-green-200 text-green-800',
            'published': 'bg-purple-200 text-purple-800'
        };

        const statusLabels = {
            'draft': 'Draft',
            'in_progress': 'In Progress',
            'ready': 'Ready',
            'published': 'Published'
        };

        return `
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onclick="viewIdeaDetail(${idea.id})">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-semibold text-gray-800">${escapeHtml(idea.title)}</h3>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColors[idea.status]}">
                        ${statusLabels[idea.status]}
                    </span>
                </div>
                <p class="text-gray-600 mb-3 line-clamp-2">${idea.description ? escapeHtml(idea.description) : 'Tidak ada deskripsi'}</p>
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center space-x-4">
                        ${idea.tags ? `<span>🏷️ ${escapeHtml(idea.tags)}</span>` : ''}
                        <span>📎 ${idea.attachment_count} lampiran</span>
                    </div>
                    <span>${formatDate(idea.created_at)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Display Pagination
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    if (pagination.page > 1) {
        html += `<button onclick="loadIdeas(${pagination.page - 1})" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Prev</button>`;
    }

    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.page) {
            html += `<button class="px-4 py-2 bg-blue-500 text-white rounded">${i}</button>`;
        } else {
            html += `<button onclick="loadIdeas(${i})" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">${i}</button>`;
        }
    }

    if (pagination.page < pagination.totalPages) {
        html += `<button onclick="loadIdeas(${pagination.page + 1})" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Next</button>`;
    }

    container.innerHTML = html;
}

// Filters
document.getElementById('search-input').addEventListener('input', debounce(() => loadIdeas(1), 500));
document.getElementById('status-filter').addEventListener('change', () => loadIdeas(1));
document.getElementById('tag-filter').addEventListener('input', debounce(() => loadIdeas(1), 500));

// Add Idea
document.getElementById('add-idea-btn').addEventListener('click', () => {
    currentIdeaId = null;
    document.getElementById('modal-title').textContent = 'Tambah Ide Baru';
    document.getElementById('idea-form').reset();
    document.getElementById('idea-id').value = '';
    document.getElementById('modal-error').classList.add('hidden');
    document.getElementById('idea-modal').classList.remove('hidden');
});

// Cancel Modal
document.getElementById('cancel-modal-btn').addEventListener('click', () => {
    document.getElementById('idea-modal').classList.add('hidden');
});

// Save Idea
document.getElementById('idea-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const ideaId = document.getElementById('idea-id').value;
    const title = document.getElementById('idea-title').value;
    const description = document.getElementById('idea-description').value;
    const tags = document.getElementById('idea-tags').value;
    const status = document.getElementById('idea-status').value;

    const method = ideaId ? 'PUT' : 'POST';
    const url = ideaId ? `${API_URL}/api/ideas/${ideaId}` : `${API_URL}/api/ideas`;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, tags, status })
        });

        const data = await res.json();

        if (!res.ok) {
            showModalError(data.error);
            return;
        }

        document.getElementById('idea-modal').classList.add('hidden');
        showNotification(ideaId ? 'Ide berhasil diperbarui' : 'Ide berhasil ditambahkan', 'success');
        loadIdeas(currentPage);
    } catch (error) {
        showModalError('Gagal menyimpan ide');
    }
});

// Show Modal Error
function showModalError(message) {
    const errorEl = document.getElementById('modal-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// View Idea Detail
async function viewIdeaDetail(id) {
    try {
        const res = await fetch(`${API_URL}/api/ideas/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            showNotification('Gagal memuat detail ide', 'error');
            return;
        }

        currentIdeaId = id;
        displayIdeaDetail(data.idea, data.attachments, data.stats);
        document.getElementById('detail-modal').classList.remove('hidden');
    } catch (error) {
        showNotification('Gagal memuat detail ide', 'error');
    }
}

// Display Idea Detail
function displayIdeaDetail(idea, attachments, stats) {
    const statusColors = {
        'draft': 'bg-gray-200 text-gray-800',
        'in_progress': 'bg-blue-200 text-blue-800',
        'ready': 'bg-green-200 text-green-800',
        'published': 'bg-purple-200 text-purple-800'
    };

    const statusLabels = {
        'draft': 'Draft',
        'in_progress': 'In Progress',
        'ready': 'Ready',
        'published': 'Published'
    };

    document.getElementById('detail-title').textContent = idea.title;
    document.getElementById('detail-status').textContent = statusLabels[idea.status];
    document.getElementById('detail-status').className = `px-3 py-1 rounded-full text-sm font-semibold ${statusColors[idea.status]}`;
    document.getElementById('detail-days').textContent = `${stats.daysSinceCreated} hari sejak dibuat`;
    document.getElementById('detail-description').textContent = idea.description || 'Tidak ada deskripsi';
    document.getElementById('detail-created').textContent = formatDate(idea.created_at);
    document.getElementById('detail-updated').textContent = formatDate(idea.updated_at);

    const tagsContainer = document.getElementById('detail-tags');
    if (idea.tags) {
        const tags = idea.tags.split(',').map(tag => tag.trim());
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${escapeHtml(tag)}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="text-gray-500 text-sm">Tidak ada tag</span>';
    }

    displayAttachments(attachments);
}

// Display Attachments
function displayAttachments(attachments) {
    const container = document.getElementById('attachments-list');

    if (attachments.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Belum ada lampiran</p>';
        return;
    }

    container.innerHTML = attachments.map(att => {
        const fileExt = att.file_name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
        const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(fileExt);
        const isAudio = ['mp3', 'wav', 'ogg'].includes(fileExt);
        const isPdf = fileExt === 'pdf';
        
        let icon = '📄';
        if (isImage) icon = '🖼️';
        else if (isVideo) icon = '🎥';
        else if (isAudio) icon = '🎵';
        else if (isPdf) icon = '📕';
        
        return `
            <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                ${isImage ? `
                    <a href="${att.file_url}" target="_blank" class="block">
                        <img src="${att.file_url}" alt="${escapeHtml(att.file_name)}" 
                             class="w-full h-32 object-cover rounded-lg hover:opacity-90 transition cursor-pointer"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                        <div style="display:none;" class="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span class="text-4xl">${icon}</span>
                        </div>
                    </a>
                ` : ''}
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <span class="text-2xl flex-shrink-0">${icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-800 truncate">${escapeHtml(att.file_name)}</p>
                            <p class="text-xs text-gray-500">${formatFileSize(att.size)}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        <a href="${att.file_url}" target="_blank" download="${att.file_name}" 
                           class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition">
                            ${isImage || isVideo || isAudio || isPdf ? 'Lihat' : 'Download'}
                        </a>
                        <button onclick="deleteAttachment(${att.id})" 
                                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition">
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Close Detail Modal
document.getElementById('close-detail-btn').addEventListener('click', () => {
    document.getElementById('detail-modal').classList.add('hidden');
});

// Edit Idea from Detail
document.getElementById('edit-idea-btn').addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/api/ideas/${currentIdeaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            showNotification('Gagal memuat ide', 'error');
            return;
        }

        document.getElementById('detail-modal').classList.add('hidden');
        document.getElementById('modal-title').textContent = 'Edit Ide';
        document.getElementById('idea-id').value = data.idea.id;
        document.getElementById('idea-title').value = data.idea.title;
        document.getElementById('idea-description').value = data.idea.description || '';
        document.getElementById('idea-tags').value = data.idea.tags || '';
        document.getElementById('idea-status').value = data.idea.status;
        document.getElementById('modal-error').classList.add('hidden');
        document.getElementById('idea-modal').classList.remove('hidden');
    } catch (error) {
        showNotification('Gagal memuat ide', 'error');
    }
});

// Delete Idea
document.getElementById('delete-idea-btn').addEventListener('click', () => {
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus ide ini? Semua lampiran terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.',
        async () => {
            try {
                const res = await fetch(`${API_URL}/api/ideas/${currentIdeaId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    showNotification('Gagal menghapus ide', 'error');
                    return;
                }

                document.getElementById('detail-modal').classList.add('hidden');
                showNotification('Ide berhasil dihapus', 'success');
                loadIdeas(currentPage);
            } catch (error) {
                showNotification('Gagal menghapus ide', 'error');
            }
        }
    );
});

// Upload File
document.getElementById('file-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('idea_id', currentIdeaId);

    try {
        const res = await fetch(`${API_URL}/api/attachments/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            showNotification('Gagal mengupload file', 'error');
            return;
        }

        showNotification('File berhasil diupload', 'success');
        viewIdeaDetail(currentIdeaId);
    } catch (error) {
        showNotification('Gagal mengupload file', 'error');
    }

    e.target.value = '';
});

// Delete Attachment
function deleteAttachment(id) {
    showConfirmModal(
        'Apakah Anda yakin ingin menghapus lampiran ini? Tindakan ini tidak dapat dibatalkan.',
        async () => {
            try {
                const res = await fetch(`${API_URL}/api/attachments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    showNotification('Gagal menghapus lampiran', 'error');
                    return;
                }

                showNotification('Lampiran berhasil dihapus', 'success');
                viewIdeaDetail(currentIdeaId);
            } catch (error) {
                showNotification('Gagal menghapus lampiran', 'error');
            }
        }
    );
}

// Load Stats
async function loadStats() {
    try {
        const res = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
            showNotification('Gagal memuat statistik', 'error');
            return;
        }

        displayStats(data);
    } catch (error) {
        showNotification('Gagal memuat statistik', 'error');
    }
}

// Display Stats
function displayStats(data) {
    document.getElementById('stat-total-ideas').textContent = data.totalIdeas;
    document.getElementById('stat-total-attachments').textContent = data.totalAttachments;
    document.getElementById('stat-total-storage').textContent = formatFileSize(data.totalStorage);

    // Status Chart
    const statusCtx = document.getElementById('status-chart').getContext('2d');
    if (window.statusChart) window.statusChart.destroy();
    
    const statusLabels = {
        'draft': 'Draft',
        'in_progress': 'In Progress',
        'ready': 'Ready',
        'published': 'Published'
    };

    window.statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: data.statusStats.map(s => statusLabels[s.status] || s.status),
            datasets: [{
                data: data.statusStats.map(s => s.count),
                backgroundColor: ['#9ca3af', '#60a5fa', '#34d399', '#a78bfa']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });

    // Monthly Chart
    const monthlyCtx = document.getElementById('monthly-chart').getContext('2d');
    if (window.monthlyChart) window.monthlyChart.destroy();

    window.monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: data.monthlyStats.map(m => m.month).reverse(),
            datasets: [{
                label: 'Jumlah Ide',
                data: data.monthlyStats.map(m => m.count).reverse(),
                backgroundColor: '#60a5fa'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Utilities
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
