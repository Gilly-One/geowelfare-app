(async function(){
  const root = await GWF.components.initPage('Settings / Import', {adminOnly:true});
  let [members, transactions, receipts, beneficiaries, coffers, announcements, documents, messages] = await Promise.all(['members','transactions','receipts','beneficiaries','coffers','announcements','documents','messages'].map(GWF.db.all));
  root.innerHTML = `<div class="grid grid-2"><div class="card"><h3>Database status</h3><p class="sub">Backend currently in use: <strong>${GWF.db.backendName()}</strong></p><div style="margin-top:14px" class="${GWF.db.isSupabaseReady()||GWF.db.isFirebaseReady()?'success':'notice'}">${GWF.db.isSupabaseReady()?'Connected to Supabase.':GWF.db.isFirebaseReady()?'Connected to Firebase Firestore.':'Using localStorage demo mode.'}</div><div class="table-wrap" style="margin-top:14px"><table><tbody><tr><th>Members</th><td>${members.length}</td></tr><tr><th>Transactions</th><td>${transactions.length}</td></tr><tr><th>Receipts</th><td>${receipts.length}</td></tr><tr><th>Beneficiaries</th><td>${beneficiaries.length}</td></tr><tr><th>Coffers</th><td>${coffers.length}</td></tr><tr><th>Announcements</th><td>${announcements.length}</td></tr><tr><th>Documents</th><td>${documents.length}</td></tr><tr><th>Messages</th><td>${messages.length}</td></tr></tbody></table></div></div><div class="card"><h3>Backup / restore</h3><p class="sub">Download or restore JSON backups. Restore is useful when moving data between Firebase, Supabase, local test mode, or after a cleanup.</p><button class="btn" id="backupBtn" style="margin-top:14px">Download backup JSON</button><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><h3>Upload / import backup JSON</h3><div class="field" style="margin-top:12px"><label>Select backup JSON</label><input type="file" id="backupFile" accept=".json,application/json"></div><label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" id="replaceBeforeRestore"> <span><strong>Replace existing data first</strong><br><small class="muted">Clears members, transactions, receipts, beneficiaries, coffers and announcements before restoring the JSON backup.</small></span></label><button class="btn secondary" id="restoreBtn" style="margin-top:14px">Restore backup JSON</button><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><h3>Import Excel workbook</h3><p class="sub">Use the migration page. It preserves member ID formats exactly as they exist.</p><a class="btn secondary" href="migrate/import-excel.html">Open Excel import tool</a></div></div><div class="card" style="margin-top:18px"><div class="card-header"><div><h3>News / Announcement Bulletin</h3><p class="sub">Announcements entered here automatically show in the sidebar and on the member page.</p></div><button class="btn" id="addAnnouncementBtn">+ Add announcement</button></div><div class="table-wrap" id="announcementTable"></div></div><div class="card" style="margin-top:18px"><div class="card-header"><div><h3>Media / Document Uploads</h3><p class="sub">Upload PDFs, images, Word/Excel files, or notices for members to view/download.</p></div></div><form id="documentForm" class="form-grid"><div class="field"><label>Title</label><input name="title" required placeholder="e.g. May 2026 Statement"></div><div class="field"><label>Category</label><select name="category"><option>General</option><option>Financial</option><option>Meeting</option><option>Policy</option><option>Notice</option><option>Other</option></select></div><div class="field full"><label>Description</label><textarea name="description"></textarea></div><div class="field"><label>Visibility</label><select name="visibility"><option value="members">Members</option><option value="admin">Admin only</option></select></div><div class="field"><label>File</label><input type="file" id="documentFile" required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,image/png,image/jpeg,application/pdf"></div><button class="btn" type="submit" id="documentUploadBtn">Upload document</button><div class="upload-status" id="documentUploadStatus"></div></form><div class="table-wrap" id="documentsTable" style="margin-top:16px"></div></div><div class="card" style="margin-top:18px"><h3>App constants</h3><div class="table-wrap" style="margin-top:12px"><table><tbody><tr><th>Organisation</th><td>${GWF.escape(GWF.settings.organizationName)}</td></tr><tr><th>Dues schedule</th><td>${GWF.money(50)} through 2026; ${GWF.money(100)} from 2027 onward</td></tr><tr><th>Receipt prefix</th><td>${GWF.escape(GWF.settings.receiptPrefix)}</td></tr><tr><th>Receipt sequence rule</th><td>Globally sequential by highest existing suffix; does not reset per year.</td></tr></tbody></table></div></div><div class="card" style="margin-top:18px;border-color:#fecdca"><h3 style="color:#b42318">Danger Zone</h3><p class="sub">Use this only when an import was done wrongly or duplicated. This clears operational welfare data but keeps login users, role documents, and announcements.</p><div class="notice" style="margin-top:14px"><strong>Deletes:</strong> members, transactions, receipts, beneficiaries, coffers.<br><strong>Does not delete:</strong> users/roles or announcements.</div><div class="field" style="margin-top:14px"><label>Type CLEAR DATA to enable deletion</label><input id="clearConfirm" placeholder="CLEAR DATA"></div><button class="btn danger" id="clearBtn" style="margin-top:12px" disabled>Clear all imported/operational data</button></div>`;

  function announcementForm(a={}){ return `<form id="announcementForm" class="form-grid"><div class="field"><label>Title</label><input name="title" required value="${GWF.escape(a.title||'')}"></div><div class="field"><label>Date</label><input type="date" name="date" value="${GWF.escape(a.date||GWF.todayISO())}"></div><div class="field full"><label>Message</label><textarea name="body" required>${GWF.escape(a.body||'')}</textarea></div><div class="field"><label>Status</label><select name="active"><option value="true" ${a.active!==false?'selected':''}>Active / show</option><option value="false" ${a.active===false?'selected':''}>Hidden</option></select></div><button class="btn" type="submit">Save announcement</button></form>`; }
  function renderAnnouncements(){
    const rows = announcements.sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
    announcementTable.innerHTML = `<table><thead><tr><th>Date</th><th>Title</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td>${GWF.escape(a.date||'')}</td><td><strong>${GWF.escape(a.title||'')}</strong></td><td>${GWF.escape(a.body||'')}</td><td>${a.active!==false?'<span class="badge active">Active</span>':'<span class="badge inactive">Hidden</span>'}</td><td><button class="btn small secondary" data-edit-ann="${a.id}">Edit</button> <button class="btn small danger" data-del-ann="${a.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty-state">No announcements yet.</td></tr>'}</tbody></table>`;
    announcementTable.querySelectorAll('[data-edit-ann]').forEach(btn=>btn.onclick=()=>openAnnouncement(announcements.find(a=>a.id===btn.dataset.editAnn)));
    announcementTable.querySelectorAll('[data-del-ann]').forEach(btn=>btn.onclick=async()=>{ if(confirm('Delete this announcement?')){ await GWF.db.remove('announcements', btn.dataset.delAnn); announcements=await GWF.db.all('announcements'); renderAnnouncements(); GWF.components.renderSidebar?.(); }});
  }
  function openAnnouncement(a){ const mod=GWF.components.modal(a?'Edit announcement':'Add announcement', announcementForm(a)); mod.querySelector('#announcementForm').onsubmit=async e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); data.active = data.active === 'true'; if(a) await GWF.db.update('announcements', a.id, data); else await GWF.db.add('announcements', data); announcements=await GWF.db.all('announcements'); mod.remove(); renderAnnouncements(); GWF.components.renderSidebar?.(); GWF.toast('Announcement saved.','success'); }; }
  addAnnouncementBtn.onclick=()=>openAnnouncement(); renderAnnouncements();

  function renderDocuments(){
    const rows = documents.sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')));
    documentsTable.innerHTML = `<table><thead><tr><th>Title</th><th>Category</th><th>File</th><th>Visibility</th><th>Uploaded</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr><td><strong>${GWF.escape(d.title||'')}</strong><br><small>${GWF.escape(d.description||'')}</small></td><td>${GWF.escape(d.category||'')}</td><td>${GWF.escape(d.fileName||'')}</td><td>${GWF.escape(d.visibility||'members')}</td><td>${GWF.escape((d.createdAt||'').slice(0,10))}</td><td><button class="btn small secondary" data-open-doc="${d.id}">Open</button> <button class="btn small danger" data-del-doc="${d.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-state">No documents uploaded.</td></tr>'}</tbody></table>`;
    documentsTable.querySelectorAll('[data-open-doc]').forEach(btn=>btn.onclick=()=>GWF.openDocumentFile(documents.find(d=>d.id===btn.dataset.openDoc)));
    documentsTable.querySelectorAll('[data-del-doc]').forEach(btn=>btn.onclick=async()=>{ const d=documents.find(x=>x.id===btn.dataset.delDoc); if(!confirm('Delete this document?')) return; try{ if(d?.storageBucket && d?.storagePath && GWF.db.isSupabaseReady()) await GWF.db.supabaseClient().storage.from(d.storageBucket).remove([d.storagePath]); }catch(e){} await GWF.db.remove('documents', btn.dataset.delDoc); documents=await GWF.db.all('documents'); renderDocuments(); GWF.toast('Document deleted.','success'); });
  }
  documentForm.onsubmit=async e=>{
    e.preventDefault();
    let file = documentFile.files[0]; if(!file) return GWF.toast('Choose a file first.','error');
    const data = Object.fromEntries(new FormData(documentForm).entries());
    documentUploadBtn.disabled=true; documentUploadBtn.textContent='Uploading...';
    try{
      GWF.validateUploadFiles([file], {maxFiles:1, maxMB:5, totalMaxMB:5});
      GWF.setUploadProgress(documentUploadStatus, `Preparing ${GWF.formatBytes(file.size)}... 10%`, 10);
      file = await GWF.compressImageIfNeeded(file, 2);
      GWF.setUploadProgress(documentUploadStatus, `Uploading ${GWF.formatBytes(file.size)}... 60%`, 60);
      const id = GWF.uid('doc'); const safe = GWF.safeFileName(file.name); const meta = {id, ...data, fileName:file.name, fileType:file.type, fileSize:file.size, uploadedBy:GWF.currentUser()?.displayName||'Admin', visibility:data.visibility||'members'};
      if(GWF.db.isSupabaseReady()){
        const bucket='welfare-documents'; const path=`${new Date().getFullYear()}/${id}-${safe}`;
        const {error}=await GWF.db.supabaseClient().storage.from(bucket).upload(path, file, {upsert:false, contentType:file.type||'application/octet-stream'});
        if(error) throw error;
        meta.storageBucket=bucket; meta.storagePath=path;
      } else {
        meta.url = await GWF.fileToDataUrl(file);
      }
      GWF.setUploadProgress(documentUploadStatus, `Saving record... 90%`, 90);
      await GWF.db.add('documents', meta); documents=await GWF.db.all('documents'); documentForm.reset(); renderDocuments(); GWF.setUploadProgress(documentUploadStatus, `Upload complete. 100%`, 100); GWF.toast('Document uploaded.','success');
      setTimeout(()=>documentUploadStatus.innerHTML='', 1800);
    } catch(err){ GWF.toast(err.message || 'Upload failed.','error'); documentUploadStatus.innerHTML=''; }
    finally{ documentUploadBtn.disabled=false; documentUploadBtn.textContent='Upload document'; }
  };
  renderDocuments();

  backupBtn.onclick=()=>GWF.downloadText(`gwf-backup-${GWF.todayISO()}.json`, JSON.stringify({members,transactions,receipts,beneficiaries,coffers,announcements,documents,messages},null,2), 'application/json');
  restoreBtn.onclick=async()=>{
    if (!backupFile.files[0]) return GWF.toast('Choose a backup JSON file first.', 'error');
    let backup;
    try { backup = JSON.parse(await backupFile.files[0].text()); } catch(e){ return GWF.toast('Invalid JSON backup file.', 'error'); }
    const cols = ['members','transactions','receipts','beneficiaries','coffers','announcements','documents','messages'];
    const found = cols.filter(c => Array.isArray(backup[c]));
    if (!found.length) return GWF.toast('Backup JSON does not contain recognised app collections.', 'error');
    const action = replaceBeforeRestore.checked ? 'replace existing data then restore' : 'merge/append backup into existing data';
    if (!confirm(`This will ${action}: ${found.join(', ')}. Continue?`)) return;
    restoreBtn.disabled = true; restoreBtn.textContent = 'Restoring backup...';
    try {
      if (replaceBeforeRestore.checked) for (const c of found) await GWF.db.clear(c);
      for (const c of found) await GWF.db.bulkPut(c, backup[c]);
      GWF.toast('Backup restored successfully.', 'success');
      setTimeout(()=>location.reload(), 1200);
    } catch(err) {
      restoreBtn.disabled = false; restoreBtn.textContent = 'Restore backup JSON'; GWF.toast(err.message, 'error');
    }
  };

  clearConfirm.addEventListener('input',()=>{ clearBtn.disabled = clearConfirm.value.trim() !== 'CLEAR DATA'; });
  clearBtn.onclick=async()=>{ if (clearConfirm.value.trim() !== 'CLEAR DATA') return; if(!confirm('This will permanently delete members, payments, receipts, beneficiaries and coffers. Continue?')) return; if(!confirm('Final confirmation: have you downloaded a backup JSON?')) return; clearBtn.disabled=true; clearBtn.textContent='Clearing data...'; try{ await GWF.db.clearOperationalData(); GWF.toast('Operational data cleared. You can now import a clean workbook.','success'); setTimeout(()=>location.reload(),1200); }catch(err){ clearBtn.disabled=false; clearBtn.textContent='Clear all imported/operational data'; GWF.toast(err.message,'error'); }};
})();
