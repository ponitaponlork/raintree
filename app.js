const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const send = document.querySelector('#send-button');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const emptyState = document.querySelector('#empty-state');
const clientProfile = document.querySelector('#client-profile');
const conversation = document.querySelector('#conversation');
const composerWrap = document.querySelector('#composer-wrap');
const projectList = document.querySelector('#project-list');
const clientCount = document.querySelector('#client-count');
const threadTitle = document.querySelector('#thread-title');
const activeClientName = document.querySelector('#active-client-name');
const sidebar = document.querySelector('#sidebar');
const sidebarBackdrop = document.querySelector('#sidebar-backdrop');
const contextMenu = document.querySelector('#context-menu');
const clientModal = document.querySelector('#client-modal-backdrop');
const clientForm = document.querySelector('#client-form');
const clientFiles = document.querySelector('#client-files');
const attachmentTray = document.querySelector('#attachment-tray');
const fileInput = document.querySelector('#file-input');
const searchInput = document.querySelector('#client-search');
const STORAGE_KEY = 'raintree-advisory-clients-v1';
const makeId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let clients = loadClients();
let activeClientId = clients[0]?.id || null;
let activeThreadId = clients[0]?.threads[0]?.id || null;
let pendingFiles = [];
let editingClientId = null;
let busy = false;
let sortClients = false;
let activeView = 'chat';

function loadClients() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.map(client => ({
      id: String(client.id || makeId()),
      name: String(client.name || 'Client'),
      advisorySnapshot: normalizeAdvisorySnapshot(client.advisorySnapshot),
      files: Array.isArray(client.files) ? client.files.filter(file => file && file.name && typeof file.text === 'string') : [],
      threads: Array.isArray(client.threads) ? client.threads.map(thread => ({
        id: String(thread.id || makeId()),
        sender: String(thread.sender || thread.id || makeId()),
        title: String(thread.title || 'New conversation'),
        messages: Array.isArray(thread.messages) ? thread.messages.filter(message => message && ['user', 'assistant'].includes(message.role)).map(message => ({ role: message.role, text: String(message.text || '') })) : [],
      })) : [],
    }));
  } catch (error) {
    console.warn('Could not load saved clients:', error);
    return [];
  }
}

function normalizeAdvisorySnapshot(snapshot = {}) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const allocation = source.allocation && typeof source.allocation === 'object' ? source.allocation : {};
  const percentage = value => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
  };
  return {
    riskLevel: typeof source.riskLevel === 'string' && source.riskLevel.trim() ? source.riskLevel.trim() : 'Not assessed',
    allocation: {
      cash: percentage(allocation.cash),
      bonds: percentage(allocation.bonds),
      equities: percentage(allocation.equities),
    },
  };
}

function saveClients() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch (error) {
    console.warn('Could not save client data in this browser:', error);
    alert('There is not enough browser storage to save this client data. Remove some attached files and try again.');
  }
}

function activeClient() {
  return clients.find(client => client.id === activeClientId) || null;
}

function activeThread() {
  return activeClient()?.threads.find(thread => thread.id === activeThreadId) || null;
}

function renderSidebar() {
  clientCount.textContent = clients.length;
  projectList.replaceChildren();
  const query = searchInput.value.trim().toLowerCase();
  const orderedClients = [...clients];
  if (sortClients) orderedClients.sort((a, b) => a.name.localeCompare(b.name));
  orderedClients.forEach(client => {
    if (query && !client.name.toLowerCase().includes(query)) return;
    const group = document.createElement('section');
    group.className = `client-group${client.id === activeClientId ? ' active' : ''}`;
    const row = document.createElement('div');
    row.className = 'project-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `project-item${client.id === activeClientId ? ' active' : ''}`;
    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = client.name;
    button.append(name);
    button.setAttribute('aria-label', `Open client ${client.name}`);
    button.addEventListener('click', () => selectClient(client.id));
    button.addEventListener('contextmenu', event => {
      event.preventDefault();
      showClientMenu(event.clientX, event.clientY, client);
    });
    const actions = document.createElement('div');
    actions.className = 'client-actions';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'client-more';
    more.title = `Client options for ${client.name}`;
    more.setAttribute('aria-label', `Client options for ${client.name}`);
    more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
    more.addEventListener('click', event => {
      event.stopPropagation(); const rect = more.getBoundingClientRect();
      showClientMenu(rect.left, rect.bottom + 3, client);
    });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'client-add-thread'; add.textContent = '+';
    add.title = `New chat for ${client.name}`; add.setAttribute('aria-label', `New chat for ${client.name}`);
    add.addEventListener('click', event => { event.stopPropagation(); createThread(client.id); });
    actions.append(more, add);
    row.append(button, actions);
    group.append(row);

    const threadNav = document.createElement('nav');
    threadNav.className = 'project-threads';
    threadNav.setAttribute('aria-label', `${client.name} conversations`);
    client.threads.forEach(thread => {
      const threadRow = document.createElement('div');
      threadRow.className = 'thread-row';
      const threadButton = document.createElement('button');
      threadButton.type = 'button';
      threadButton.className = `thread-item${thread.id === activeThreadId && client.id === activeClientId ? ' active' : ''}`;
      threadButton.setAttribute('aria-current', thread.id === activeThreadId && client.id === activeClientId ? 'page' : 'false');
      threadButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-1.8 1.5.7-4A7.5 7.5 0 1 1 20 11.5Z"/></svg>';
      const title = document.createElement('span'); title.className = 'thread-name'; title.textContent = thread.title;
      threadButton.append(title);
      threadButton.addEventListener('click', () => selectThread(client.id, thread.id));
      const options = document.createElement('button');
      options.type = 'button'; options.className = 'thread-more'; options.title = 'Conversation options'; options.setAttribute('aria-label', `Conversation options for ${thread.title}`);
      options.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
      options.addEventListener('click', event => {
        event.stopPropagation(); const rect = options.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom + 3, [{ label: 'Delete conversation', danger: true, action: () => deleteThread(client.id, thread.id) }]);
      });
      threadRow.append(threadButton, options);
      threadNav.append(threadRow);
    });
    group.append(threadNav);

    projectList.append(group);
  });
  if (!projectList.children.length && query) {
    const empty = document.createElement('div'); empty.className = 'thread-empty'; empty.textContent = 'No matching clients'; projectList.append(empty);
  }
}

function showClientMenu(x, y, client) {
  showContextMenu(x, y, [
    { label: 'Edit client information', action: () => openClientModal(client) },
    { label: 'Delete client', danger: true, action: () => deleteClient(client.id) },
  ]);
}

function renderClientProfile(client) {
  clientProfile.replaceChildren();
  const heading = document.createElement('div');
  heading.className = 'profile-heading';
  const title = document.createElement('h2');
  title.textContent = client.name;
  const actions = document.createElement('div');
  actions.className = 'profile-actions';
  const edit = document.createElement('button');
  edit.type = 'button'; edit.className = 'button-secondary'; edit.textContent = 'Edit client';
  edit.addEventListener('click', () => openClientModal(client));
  actions.append(edit);
  const titleBlock = document.createElement('div');
  titleBlock.append(title);
  heading.append(titleBlock, actions);

  const snapshot = normalizeAdvisorySnapshot(client.advisorySnapshot);
  const insights = document.createElement('section'); insights.className = 'advisory-insights';
  const riskCard = document.createElement('article'); riskCard.className = 'advisory-insight-card';
  riskCard.innerHTML = '<span>Risk level</span>';
  const riskLevel = document.createElement('strong'); riskLevel.textContent = snapshot.riskLevel;
  const riskCopy = document.createElement('p'); riskCopy.textContent = 'Available after the risk conversation is complete.';
  riskCard.append(riskLevel, riskCopy);

  const allocationCard = document.createElement('article'); allocationCard.className = 'advisory-insight-card';
  allocationCard.innerHTML = '<span>Asset allocation</span>';
  const allocation = snapshot.allocation;
  const hasAllocation = Object.values(allocation).every(value => value !== null);
  const allocationValue = document.createElement('strong');
  allocationValue.textContent = hasAllocation ? 'Illustrative mix' : 'Not available';
  const allocationDetail = document.createElement('p');
  allocationDetail.textContent = hasAllocation
    ? `Cash ${allocation.cash}% · Bonds ${allocation.bonds}% · Equities ${allocation.equities}%`
    : 'Available once enough context is available.';
  allocationCard.append(allocationValue, allocationDetail);
  insights.append(riskCard, allocationCard);
  clientProfile.append(heading, insights);
}

function renderCurrent() {
  const client = activeClient();
  const thread = activeThread();
  renderSidebar();
  messages.replaceChildren();
  pendingFiles = [];
  renderAttachmentTray();
  if (!client) {
    document.querySelector('.workspace').classList.remove('empty-thread', 'profile-view', 'has-suggestions');
    activeClientName.textContent = 'Select a client';
    threadTitle.textContent = 'Choose a client or chat';
    emptyState.hidden = false;
    clientProfile.hidden = true;
    welcome.hidden = true;
    composerWrap.hidden = true;
    document.querySelector('#thread-menu').hidden = true;
    conversation.scrollTop = 0;
    return;
  }

  emptyState.hidden = true;
  activeClientName.textContent = client.name;
  const profileView = activeView === 'profile';
  threadTitle.textContent = profileView ? 'Profile' : (thread?.title || 'New conversation');
  const emptyChat = !profileView && !thread?.messages.length;
  document.querySelector('.workspace').classList.toggle('profile-view', profileView);
  document.querySelector('.workspace').classList.toggle('empty-thread', emptyChat);
  document.querySelector('.workspace').classList.toggle('has-suggestions', emptyChat);
  clientProfile.hidden = !profileView;
  if (profileView) renderClientProfile(client);
  document.querySelector('#welcome h2').textContent = `Conversation about ${client.name}`;
  document.querySelector('#welcome p').textContent = 'Start with risk profiling, compare sample products, or prepare for the next advisory discussion.';
  const suggestedPrompts = [
    ['Assess risk profile', `Guide me through a risk profile for ${client.name}, covering time horizon, liquidity needs, investment experience, and comfort with losses.`],
    ['Compare ETF examples', 'Compare the available ETF examples by risk, expense ratio, liquidity, and trade-offs.'],
    ['Prepare advisory discussion', `Prepare an agenda and focused questions for ${client.name}'s next advisory discussion.`],
  ];
  document.querySelectorAll('.suggestions [data-prompt]').forEach((button, index) => {
    const [label, prompt] = suggestedPrompts[index];
    button.textContent = label;
    button.dataset.prompt = prompt;
  });
  welcome.hidden = profileView || Boolean(thread?.messages.length);
  composerWrap.hidden = profileView;
  document.querySelector('#thread-menu').hidden = !thread || profileView;
  thread?.messages.forEach(message => addMessage(message.role, message.text, false));
  conversation.scrollTop = profileView ? 0 : conversation.scrollHeight;
}

function selectClient(id) {
  if (busy) return;
  activeView = 'profile';
  activeClientId = id;
  const client = activeClient();
  activeThreadId = client?.threads[0]?.id || null;
  renderCurrent();
  closeSidebar();
}

function selectThread(clientId, id) {
  if (busy) return;
  activeView = 'chat';
  activeClientId = clientId;
  activeThreadId = id;
  renderCurrent();
  closeSidebar();
}

function createThread(clientId = activeClientId) {
  if (busy) return;
  const client = clients.find(item => item.id === clientId);
  if (!client) {
    openClientModal();
    return;
  }
  const thread = { id: makeId(), sender: makeId(), title: 'New conversation', messages: [] };
  client.threads.unshift(thread);
  activeClientId = client.id;
  activeThreadId = thread.id;
  saveClients();
  renderCurrent();
  closeSidebar();
  input.focus();
}

function newClient() {
  if (busy) return;
  openClientModal();
}

function openClientModal(client = null) {
  editingClientId = client?.id || null;
  document.querySelector('#client-modal-title').textContent = client ? 'Client information' : 'New Client';
  document.querySelector('#save-client').textContent = client ? 'Save changes' : 'Create client';
  document.querySelector('#client-name-input').value = client?.name || '';
  renderClientFiles(client);
  clientModal.hidden = false;
  document.querySelector('#client-name-input').focus();
}

function closeClientModal() {
  clientModal.hidden = true;
  editingClientId = null;
}

function renderClientFiles(client) {
  clientFiles.replaceChildren();
  if (!client?.files.length) {
    clientFiles.hidden = true;
    return;
  }
  clientFiles.hidden = false;
  const label = document.createElement('div');
  label.className = 'client-files-label';
  label.textContent = 'Shared client files';
  clientFiles.append(label);
  client.files.forEach((file, index) => {
    const row = document.createElement('div');
    row.className = 'client-file-row';
    const name = document.createElement('span');
    name.textContent = file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      const current = clients.find(item => item.id === editingClientId);
      if (!current) return;
      current.files.splice(index, 1);
      saveClients();
      renderClientFiles(current);
    });
    row.append(name, remove);
    clientFiles.append(row);
  });
}

clientForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#client-name-input').value.trim();
  if (!name) return;
  if (editingClientId) {
    const client = clients.find(item => item.id === editingClientId);
    if (client) {
      client.name = name;
      saveClients();
    }
  } else {
    const client = { id: makeId(), name, advisorySnapshot: normalizeAdvisorySnapshot(), files: [], threads: [] };
    clients.unshift(client);
    activeClientId = client.id;
    activeView = 'chat';
    const thread = { id: makeId(), sender: makeId(), title: 'New conversation', messages: [] };
    client.threads.push(thread);
    activeThreadId = thread.id;
    saveClients();
  }
  closeClientModal();
  renderCurrent();
  closeSidebar();
  if (activeThread()) input.focus();
});

function showContextMenu(x, y, actions) {
  contextMenu.replaceChildren();
  actions.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.danger ? 'danger' : '';
    button.textContent = item.label;
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => {
      hideContextMenu();
      item.action();
    });
    contextMenu.append(button);
  });
  contextMenu.hidden = false;
  const rect = contextMenu.getBoundingClientRect();
  contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
}

function hideContextMenu() {
  contextMenu.hidden = true;
}

function deleteClient(id) {
  if (busy) return;
  const client = clients.find(item => item.id === id);
  if (!client || !confirm(`Remove ${client.name}, its advisory data, files, and chats from this browser?`)) return;
  clients = clients.filter(item => item.id !== id);
  if (activeClientId === id) {
    activeClientId = clients[0]?.id || null;
    activeThreadId = clients[0]?.threads[0]?.id || null;
  }
  saveClients();
  renderCurrent();
}

function deleteThread(clientId, id) {
  if (busy) return;
  const client = clients.find(item => item.id === clientId);
  const thread = client?.threads.find(item => item.id === id);
  if (!client || !thread || !confirm(`Remove the chat “${thread.title}” from this browser?`)) return;
  client.threads = client.threads.filter(item => item.id !== id);
  if (!client.threads.length) client.threads.push({ id: makeId(), sender: makeId(), title: 'New conversation', messages: [] });
  if (activeClientId === clientId && activeThreadId === id) activeThreadId = client.threads[0]?.id || null;
  saveClients();
  renderCurrent();
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('visible');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (match, label, url) => {
    const safeUrl = url.replace(/&amp;/g, '&');
    return /^https?:\/\//i.test(safeUrl)
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : match;
  });
  html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong>$1$2</strong>');
  html = html.replace(/\*(.+?)\*|_(.+?)_/g, '<em>$1$2</em>');
  return html;
}

function renderMarkdown(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<${listType}>${listItems.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    listItems = [];
    listType = null;
  };
  const splitTableRow = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  const isTableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    const listMatch = trimmed.match(/^([-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (!trimmed) { flushParagraph(); flushList(); continue; }
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(---+|\*\*\*+|___+)\s*$/.test(trimmed)) {
      flushParagraph(); flushList(); blocks.push('<hr>'); continue;
    }
    if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      flushParagraph(); flushList();
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      const head = headers.map(cell => `<th>${renderInlineMarkdown(cell)}</th>`).join('');
      const body = rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${renderInlineMarkdown(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('');
      blocks.push(`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }
    if (listMatch) {
      flushParagraph();
      const nextType = /^\d/.test(listMatch[1]) ? 'ol' : 'ul';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push(listMatch[2]);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushList();
  return blocks.join('');
}

function createBrandMark(className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 30');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  [[0, 8, 22], [7, 4, 26], [14, 0, 30], [21, 4, 26], [28, 8, 22]].forEach(([x, y, height]) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', '3.5');
    rect.setAttribute('height', height);
    rect.setAttribute('rx', '1');
    rect.setAttribute('fill', 'currentColor');
    svg.append(rect);
  });
  return svg;
}

function addMessage(role, text, save = true) {
  const thread = activeThread();
  if (save && thread) {
    document.querySelector('.workspace').classList.remove('empty-thread');
    const isFirstMessage = thread.messages.length === 0;
    thread.messages.push({ role, text });
    if (isFirstMessage && role === 'user') {
      const label = text.replace(/\s+/g, ' ').trim();
      thread.title = label.length > 36 ? `${label.slice(0, 35).trimEnd()}…` : label;
      threadTitle.textContent = thread.title;
      renderSidebar();
    }
    saveClients();
  }
  welcome.hidden = true;
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const avatar = document.createElement('span');
  avatar.className = 'message-avatar';
  avatar.append(createBrandMark('message-mark'));
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = role === 'assistant' ? renderMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br>');
  article.append(avatar, bubble);
  messages.append(article);
  conversation.scrollTop = conversation.scrollHeight;
}

function renderAttachmentTray() {
  attachmentTray.replaceChildren();
  attachmentTray.hidden = pendingFiles.length === 0;
  pendingFiles.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    const name = document.createElement('span');
    name.textContent = file.name;
    name.title = file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8"/></svg>';
    remove.addEventListener('click', () => {
      pendingFiles.splice(index, 1);
      renderAttachmentTray();
    });
    chip.append(name, remove);
    attachmentTray.append(chip);
  });
  send.disabled = (!input.value.trim() && !pendingFiles.length) || busy;
}

async function extractFileText(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is over the 15 MB limit.`);
  const extension = file.name.split('.').pop().toLowerCase();
  if (['txt', 'md', 'csv', 'json', 'yaml', 'yml', 'log'].includes(extension)) {
    return (await file.text()).slice(0, 10000);
  }
  if (extension === 'pdf') {
    if (!window.pdfjsLib && window.pdfjsReady) await window.pdfjsReady;
    if (!window.pdfjsLib) throw new Error('PDF support did not load. Try a text or CSV file.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs';
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 30); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map(item => item.str).join(' '));
      if (pageTexts.join('\n').length >= 10000) break;
    }
    const text = pageTexts.join('\n').slice(0, 10000);
    if (!text.trim()) throw new Error(`${file.name} has no selectable text. Scanned PDFs need OCR before attaching.`);
    return text;
  }
  throw new Error(`${file.name} is not a supported text or PDF file.`);
}

async function handleFiles(fileList) {
  const client = activeClient();
  if (!client) { openClientModal(); return; }
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (pendingFiles.length + files.length > 8) {
    alert('Attach up to 8 files at a time.');
    return;
  }
  for (const file of files) {
    try {
      const text = await extractFileText(file);
      pendingFiles.push({ name: file.name, size: file.size, text });
    } catch (error) {
      alert(error.message);
    }
  }
  fileInput.value = '';
  renderAttachmentTray();
}

function clientContext(client) {
  const parts = [`Client: ${client.name}`];
  const snapshot = normalizeAdvisorySnapshot(client.advisorySnapshot);
  const { cash, bonds, equities } = snapshot.allocation;
  if (snapshot.riskLevel !== 'Not assessed') parts.push(`Current risk level: ${snapshot.riskLevel}`);
  if ([cash, bonds, equities].every(value => value !== null)) parts.push(`Current illustrative allocation: cash ${cash}%, bonds ${bonds}%, equities ${equities}%`);
  if (client.files.length) {
    const docs = [];
    let remaining = 6000;
    for (const file of [...client.files].reverse()) {
      if (remaining <= 0) break;
      const content = file.text.slice(0, remaining);
      docs.push(`File: ${file.name}\n${content}`);
      remaining -= content.length;
    }
    parts.push(`Shared client documents:\n${docs.join('\n\n')}`);
  }
  const currentThreadId = activeThreadId;
  const history = client.threads
    .filter(thread => thread.id !== currentThreadId)
    .flatMap(thread => thread.messages.map(message => `${message.role === 'user' ? 'Client' : 'Assistant'}: ${message.text}`))
    .slice(-10)
    .join('\n')
    .slice(-3500);
  if (history) parts.push(`Recent conversation context for this client (the current message takes priority):\n${history}`);
  return parts.join('\n\n').slice(0, 15000);
}

function profileUpdateFrom(value) {
  if (!value || typeof value !== 'object') return null;
  const riskLevel = value.risk_level ?? value.riskLevel ?? value.risk_band ?? value.riskBand;
  const allocation = value.asset_allocation ?? value.assetAllocation ?? value.allocation_percent ?? value.allocation;
  const update = {};
  if (typeof riskLevel === 'string' && riskLevel.trim()) update.riskLevel = riskLevel.trim();
  if (allocation && typeof allocation === 'object') {
    const parsed = {};
    ['cash', 'bonds', 'equities'].forEach(key => {
      const number = Number(allocation[key]);
      if (Number.isFinite(number) && number >= 0 && number <= 100) parsed[key] = number;
    });
    if (Object.keys(parsed).length) update.allocation = parsed;
  }
  return Object.keys(update).length ? update : null;
}

function applyAssistantProfile(client, payload) {
  const messages = Array.isArray(payload) ? payload : (Array.isArray(payload?.messages) ? payload.messages : []);
  const candidates = [
    payload?.client_profile,
    payload?.clientProfile,
    payload?.custom?.client_profile,
    payload?.custom?.clientProfile,
    ...messages.flatMap(message => [
      message?.client_profile,
      message?.clientProfile,
      message?.custom?.client_profile,
      message?.custom?.clientProfile,
    ]),
  ];
  let snapshot = normalizeAdvisorySnapshot(client.advisorySnapshot);
  let changed = false;
  candidates.forEach(candidate => {
    const update = profileUpdateFrom(candidate);
    if (!update) return;
    if (update.riskLevel) snapshot.riskLevel = update.riskLevel;
    if (update.allocation) snapshot.allocation = { ...snapshot.allocation, ...update.allocation };
    changed = true;
  });
  if (changed) client.advisorySnapshot = normalizeAdvisorySnapshot(snapshot);
  return changed;
}

async function sendMessage(text) {
  const message = text.trim();
  if ((!message && !pendingFiles.length) || busy) return;
  const client = activeClient();
  if (!client) { openClientModal(); return; }
  if (!activeThread()) {
    const thread = { id: makeId(), sender: makeId(), title: 'New conversation', messages: [] };
    client.threads.unshift(thread);
    activeThreadId = thread.id;
    threadTitle.textContent = thread.title;
    renderSidebar();
  }
  const thread = activeThread();
  const attachedFiles = pendingFiles.slice();
  if (attachedFiles.length) {
    attachedFiles.forEach(file => {
      client.files.push({ name: file.name, text: file.text, size: file.size });
    });
    pendingFiles = [];
    renderAttachmentTray();
  }
  const visibleMessage = [message, attachedFiles.length ? `Attached to client files: ${attachedFiles.map(file => file.name).join(', ')}` : ''].filter(Boolean).join('\n\n');
  const requestMessage = [message || 'Please review the attached client file(s).', attachedFiles.length ? `Newly attached files: ${attachedFiles.map(file => file.name).join(', ')}` : ''].filter(Boolean).join('\n\n');
  busy = true;
  send.disabled = true;
  document.querySelector('#new-client-button').disabled = true;
  input.value = '';
  input.style.height = 'auto';
  addMessage('user', visibleMessage);

  const typing = document.createElement('article');
  typing.className = 'message assistant';
  const typingAvatar = document.createElement('span');
  typingAvatar.className = 'message-avatar';
  typingAvatar.append(createBrandMark('message-mark'));
  const typingBubble = document.createElement('div');
  typingBubble.className = 'bubble typing';
  typingBubble.innerHTML = '<i></i><i></i><i></i>';
  typing.append(typingAvatar, typingBubble);
  messages.append(typing);
  conversation.scrollTop = conversation.scrollHeight;
  saveClients();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: thread.sender || thread.id, message: requestMessage, client_context: clientContext(client) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The advisory service could not respond.');
    typing.remove();
    const profileUpdated = applyAssistantProfile(client, payload);
    const replies = (Array.isArray(payload) ? payload : payload.messages || [])
      .map(item => typeof item === 'string' ? item : item.text)
      .filter(Boolean);
    if (replies.length) addMessage('assistant', replies.join('\n'));
    else addMessage('assistant', 'I’m here to help you think it through. What would you like to start with?');
    if (profileUpdated) saveClients();
  } catch (error) {
    typing.remove();
    addMessage('assistant', `I couldn't reach the Rasa assistant. Check that the agent is running, then try again. (${error.message})`);
  } finally {
    busy = false;
    document.querySelector('#new-client-button').disabled = false;
    send.disabled = !input.value.trim() && !pendingFiles.length;
    input.focus();
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(input.value);
});

document.querySelector('#new-client-button').addEventListener('click', newClient);
document.querySelector('#empty-action').addEventListener('click', newClient);
document.querySelector('#add-client-button').addEventListener('click', newClient);
document.querySelector('#sort-clients-button').addEventListener('click', () => { sortClients = !sortClients; renderSidebar(); });
searchInput.addEventListener('input', renderSidebar);
document.querySelector('#menu-button').addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('visible');
});
sidebarBackdrop.addEventListener('click', closeSidebar);
document.querySelector('#cancel-client').addEventListener('click', closeClientModal);
clientModal.addEventListener('click', event => { if (event.target === clientModal) closeClientModal(); });
document.querySelector('#attach-button').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
document.querySelector('#thread-menu').addEventListener('click', event => {
  const buttonRect = event.currentTarget.getBoundingClientRect();
  const thread = activeThread();
  if (thread) showContextMenu(buttonRect.right, buttonRect.bottom + 3, [
    { label: 'Delete chat', danger: true, action: () => deleteThread(activeClientId, thread.id) },
  ]);
});
document.querySelector('.thread-header').addEventListener('contextmenu', event => {
  const thread = activeThread();
  if (!thread) return;
  event.preventDefault();
  showContextMenu(event.clientX, event.clientY, [
    { label: 'Delete chat', danger: true, action: () => deleteThread(activeClientId, thread.id) },
  ]);
});
activeClientName.addEventListener('contextmenu', event => {
  const client = activeClient();
  if (!client) return;
  event.preventDefault();
  showContextMenu(event.clientX, event.clientY, [
    { label: 'Edit client information', action: () => openClientModal(client) },
    { label: 'Delete client', danger: true, action: () => deleteClient(client.id) },
  ]);
});
document.querySelectorAll('.suggestions [data-prompt]').forEach(button => {
  button.addEventListener('click', () => {
    input.value = button.dataset.prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });
});
document.addEventListener('click', event => {
  if (!contextMenu.contains(event.target)) hideContextMenu();
});
document.addEventListener('contextmenu', event => {
  if (!event.target.closest('.project-item,.thread-item,.thread-header,.project-crumb,.client-actions,.thread-more')) hideContextMenu();
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape') {
    hideContextMenu();
    closeSidebar();
    closeClientModal();
  }
});

input.addEventListener('input', () => {
  send.disabled = (!input.value.trim() && !pendingFiles.length) || busy;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
renderCurrent();
