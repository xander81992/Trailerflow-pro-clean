'use client';

import { useMemo, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';

const FIRESTORE_DATA_COLLECTION = 'portalData';
const FIRESTORE_DATA_DOC = 'main';
const nowISO = () => new Date().toISOString();
const timeOnly = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateOnly = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const taskSteps = ['Assigned', 'Started', 'Arrived', 'Picked Up', 'Dropped', 'Completed'];
const taskButtons = ['Started', 'Arrived', 'Picked Up', 'Dropped', 'Completed'];

function createSeed() {
  const companies = [
    { id: 'hopewell', name: 'Hopewell Logistics', type: 'internal', autoApprove: false, active: true },
    { id: 'rnf', name: 'RNF', type: 'intercompany', autoApprove: true, active: true }
  ];

  const users = [
    { id: 'u-admin', name: 'Alexander Admin', email: 'admin@hopewell.local', role: 'admin', companyId: 'hopewell', active: true },
    { id: 'u-rnf', name: 'RNF Requestor', email: 'rnf@rnf.local', role: 'rnf', companyId: 'rnf', active: true }
  ];

  const whseTemplates = [
    ['WHSE A', 'A', 8], ['WHSE B', 'B', 6], ['WHSE C', 'C', 5],
    ['WHSE D', 'D', 4], ['WHSE E', 'E', 7], ['WHSE F', 'F', 6]
  ];
  const warehouses = whseTemplates.map(([name, code, doorCount], index) => ({
    id: `w-${code.toLowerCase()}`,
    name,
    code,
    address: index === 0 ? '2243 Sheppard Ave W, North York' : `${100 + index} Distribution Drive`,
    active: true,
    createdAt: nowISO()
  }));

  const doors = [];
  warehouses.forEach((whse) => {
    const count = whseTemplates.find((x) => x[1] === whse.code)[2];
    for (let i = 1; i <= count; i++) {
      doors.push({
        id: `d-${whse.code.toLowerCase()}-${i}`,
        warehouseId: whse.id,
        code: `${whse.code}${i}`,
        status: i % 9 === 0 ? 'Maintenance' : 'Empty',
        trailerId: null,
        updatedAt: nowISO()
      });
    }
  });

  const trailerNumbers = ['1209', '1206', '1185', 'L1182', 'L1178', '1204', '1195', '1205', 'L1177', '1220', '1221', 'L1181', '1207', '1210', '1161', '1157'];
  const trailers = trailerNumbers.map((number, index) => ({
    id: `t-${String(index + 1).padStart(3, '0')}`,
    number,
    plate: '',
    companyId: 'rnf',
    status: index % 6 === 0 ? 'Empty' : index % 7 === 0 ? 'In Transit' : 'Loaded',
    warehouseId: null,
    doorId: null,
    activeTaskId: null,
    notes: '',
    lastMovedAt: nowISO()
  }));

  const assignPairs = [
    ['t-001', 'd-a-1'], ['t-002', 'd-a-3'], ['t-003', 'd-a-5'], ['t-004', 'd-b-2'], ['t-005', 'd-b-4'],
    ['t-008', 'd-c-1'], ['t-009', 'd-c-3'], ['t-010', 'd-d-1'], ['t-011', 'd-e-2'], ['t-012', 'd-f-1'],
    ['t-013', 'd-f-3'], ['t-014', 'd-e-5'], ['t-015', 'd-c-5'], ['t-016', 'd-a-7']
  ];
  assignPairs.forEach(([trailerId, doorId]) => {
    const door = doors.find((d) => d.id === doorId);
    const trailer = trailers.find((t) => t.id === trailerId);
    if (door && trailer) {
      door.status = 'Occupied';
      door.trailerId = trailer.id;
      trailer.warehouseId = door.warehouseId;
      trailer.doorId = door.id;
    }
  });

  const requests = [
    {
      id: 'PK-2026-000001', type: 'pickup', po: '4500123456', reference: 'OBD-90015', companyId: 'rnf',
      sourceWarehouseId: 'w-a', destinationWarehouseId: 'w-c', pallets: 25, trailerId: 't-001', priority: 'Normal',
      status: 'Assigned', approvalType: 'Auto Approved', approvedBy: 'System', requestedBy: 'u-rnf', createdAt: nowISO(), notes: 'Intercompany pickup for RNF.'
    },
    {
      id: 'ET-2026-000001', type: 'empty', po: '', reference: 'Empty Trailer', companyId: 'rnf',
      sourceWarehouseId: null, destinationWarehouseId: 'w-b', pallets: 0, trailerId: 't-006', priority: 'High',
      status: 'Assigned', approvalType: 'Auto Approved', approvedBy: 'System', requestedBy: 'u-rnf', createdAt: nowISO(), notes: 'Need empty trailer for staging.'
    }
  ];

  const tasks = [
    {
      id: 'TASK-1001', requestId: 'PK-2026-000001', type: 'pickup', companyId: 'rnf', assignedTo: null, status: 'Assigned',
      trailerId: 't-001', sourceWarehouseId: 'w-a', sourceDoorId: 'd-a-1', destinationWarehouseId: 'w-c', destinationDoorId: null,
      po: '4500123456', pallets: 25, notes: 'Move from WHSE A to WHSE C.', dueTime: '10:00 AM', createdAt: nowISO(), timestamps: { Assigned: nowISO() }
    },
    {
      id: 'TASK-1002', requestId: 'ET-2026-000001', type: 'empty', companyId: 'rnf', assignedTo: null, status: 'Assigned',
      trailerId: 't-006', sourceWarehouseId: null, sourceDoorId: null, destinationWarehouseId: 'w-b', destinationDoorId: null,
      po: '', pallets: 0, notes: 'Deliver empty trailer to WHSE B.', dueTime: '11:30 AM', createdAt: nowISO(), timestamps: { Assigned: nowISO() }
    }
  ];
  trailers.find((t) => t.id === 't-001').activeTaskId = 'TASK-1001';
  trailers.find((t) => t.id === 't-006').activeTaskId = 'TASK-1002';

  const movements = [
    { id: uid('M'), type: 'request', message: 'RNF pickup request PK-2026-000001 auto approved.', userId: 'system', createdAt: nowISO(), trailerId: 't-001' },
    { id: uid('M'), type: 'task', message: 'Task TASK-1001 added to the shunter queue.', userId: 'system', createdAt: nowISO(), trailerId: 't-001' }
  ];

  return { companies, users, warehouses, doors, trailers, requests, tasks, movements, invitations: [] };
}

const DEMO_USER_IDS = new Set(['u-admin', 'u-rnf', 'u-shunter']);

function companyToId(company) {
  const value = String(company || '').toLowerCase();
  if (value.includes('rnf')) return 'rnf';
  return 'hopewell';
}

function normalizeAuthUser(docId, profile = {}) {
  const role = String(profile.role || '').toLowerCase() || 'rnf';
  return {
    id: docId,
    name: profile.name || profile.email || 'Portal User',
    email: profile.email || '',
    role,
    companyId: profile.companyId || companyToId(profile.company),
    active: profile.active !== false
  };
}

function cleanDemoReferences(input) {
  const copy = structuredClone(input || createSeed());
  copy.users = (copy.users || []).filter((u) => u?.id !== 'u-shunter' && u?.name !== 'John Shunter');
  copy.tasks = (copy.tasks || []).map((t) => ({
    ...t,
    assignedTo: t.assignedTo === 'u-shunter' ? null : t.assignedTo
  }));
  copy.movements = (copy.movements || []).map((m) => ({
    ...m,
    userId: m.userId === 'u-shunter' ? null : m.userId,
    message: String(m.message || '').replaceAll('John Shunter', 'the shunter queue')
  }));
  return copy;
}

function mergePortalUsers(data, authUsers = []) {
  const cleaned = cleanDemoReferences(data);
  const usersById = new Map();
  (cleaned.users || [])
    .filter((u) => !DEMO_USER_IDS.has(u.id) && u.name !== 'John Shunter')
    .forEach((u) => usersById.set(u.id, u));
  authUsers
    .filter((u) => u.active !== false)
    .forEach((u) => usersById.set(u.id, u));
  return { ...cleaned, users: Array.from(usersById.values()) };
}

function assigneeName(data, assignedTo) {
  if (!assignedTo || assignedTo === 'u-shunter') return 'Unassigned / Queue';
  return data.users?.find((u) => u.id === assignedTo)?.name || 'Assigned Shunter';
}

function useTrailerData() {
  const [data, setData] = useState(createSeed);
  const [toast, setToast] = useState('');
  const [dataReady, setDataReady] = useState(false);
  const [authUsers, setAuthUsers] = useState([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const liveUsers = snap.docs.map((d) => normalizeAuthUser(d.id, d.data()));
      setAuthUsers(liveUsers);
    }, (error) => {
      console.error('Firestore users load error:', error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setDataReady(true);
      return;
    }

    const ref = doc(db, FIRESTORE_DATA_COLLECTION, FIRESTORE_DATA_DOC);

    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const cloud = snap.data();
        setData(cleanDemoReferences(cloud.data || cloud));
      } else {
        const seed = createSeed();
        await setDoc(ref, { data: seed, updatedAt: nowISO(), createdAt: nowISO() });
        setData(cleanDemoReferences(seed));
      }
      setDataReady(true);
    }, (error) => {
      console.error('Firestore data load error:', error);
      setToast('Could not load Firestore data. Check Firestore rules.');
      setDataReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveToFirestore = async (nextData) => {
    if (!isFirebaseConfigured || !db) return;
    const ref = doc(db, FIRESTORE_DATA_COLLECTION, FIRESTORE_DATA_DOC);
    await setDoc(ref, { data: nextData, updatedAt: nowISO() }, { merge: true });
  };

  const update = (fn, message) => {
    // Run validation before React state update so button try/catch can show alerts
    // instead of crashing the whole page.
    const copy = structuredClone(mergePortalUsers(data, authUsers));
    fn(copy);
    setData(copy);
    saveToFirestore(copy).catch((error) => {
      console.error('Firestore save error:', error);
      setToast('Saved on this screen, but Firestore save failed. Check database rules.');
    });
    if (message) setToast(message);
  };

  const addMovement = (copy, message, userId, trailerId = null, type = 'audit') => {
    copy.movements.unshift({ id: uid('M'), type, message, userId, trailerId, createdAt: nowISO() });
  };

  const addWarehouse = (payload, user) => update((copy) => {
    const code = payload.code.trim().toUpperCase();
    if (!payload.name.trim() || !code) throw new Error('Warehouse name and code are required.');
    if (copy.warehouses.some((w) => w.code === code)) throw new Error('Warehouse code already exists.');
    const warehouse = { id: uid('W'), name: payload.name.trim(), code, address: payload.address.trim(), active: true, createdAt: nowISO() };
    copy.warehouses.push(warehouse);
    for (let i = 1; i <= Number(payload.doors || 0); i++) {
      copy.doors.push({ id: uid('D'), warehouseId: warehouse.id, code: `${code}${i}`, status: 'Empty', trailerId: null, updatedAt: nowISO() });
    }
    addMovement(copy, `${warehouse.name} created with ${payload.doors || 0} doors.`, user.id);
  }, 'Warehouse created.');

  const addDoor = (warehouseId, code, user) => update((copy) => {
    if (!code.trim()) throw new Error('Door code required.');
    if (copy.doors.some((d) => d.warehouseId === warehouseId && d.code.toLowerCase() === code.trim().toLowerCase())) throw new Error('Door already exists in this warehouse.');
    copy.doors.push({ id: uid('D'), warehouseId, code: code.trim().toUpperCase(), status: 'Empty', trailerId: null, updatedAt: nowISO() });
    addMovement(copy, `Door ${code.toUpperCase()} created.`, user.id);
  }, 'Door created.');

  const addTrailer = (payload, user) => update((copy) => {
    const number = payload.number.trim().toUpperCase();
    if (!number) throw new Error('Trailer number is required.');
    if (copy.trailers.some((t) => t.number === number)) throw new Error('Trailer number already exists.');
    const door = payload.doorId ? copy.doors.find((d) => d.id === payload.doorId) : null;
    if (door && door.trailerId) throw new Error('This door already has a trailer. One door can only have one trailer.');
    const trailer = {
      id: uid('T'), number, plate: payload.plate.trim(), companyId: payload.companyId, status: payload.status,
      warehouseId: door ? door.warehouseId : payload.warehouseId || null, doorId: door ? door.id : null, activeTaskId: null,
      notes: payload.notes || '', lastMovedAt: nowISO()
    };
    copy.trailers.push(trailer);
    if (door) { door.trailerId = trailer.id; door.status = 'Occupied'; door.updatedAt = nowISO(); }
    addMovement(copy, `Trailer ${number} created.`, user.id, trailer.id);
  }, 'Trailer created.');


  const updateWarehouse = (warehouseId, payload, user) => update((copy) => {
    const warehouse = copy.warehouses.find((w) => w.id === warehouseId);
    if (!warehouse) throw new Error('Warehouse not found.');
    const code = payload.code.trim().toUpperCase();
    if (!payload.name.trim() || !code) throw new Error('Warehouse name and code are required.');
    if (copy.warehouses.some((w) => w.id !== warehouseId && w.code === code)) throw new Error('Warehouse code already exists.');
    const oldName = warehouse.name;
    warehouse.name = payload.name.trim();
    warehouse.code = code;
    warehouse.address = payload.address.trim();
    warehouse.active = payload.active ?? true;
    addMovement(copy, `${oldName} updated to ${warehouse.name}.`, user.id, null, 'audit');
  }, 'Warehouse updated.');

  const deleteWarehouse = (warehouseId, user) => update((copy) => {
    const warehouse = copy.warehouses.find((w) => w.id === warehouseId);
    if (!warehouse) throw new Error('Warehouse not found.');
    const warehouseDoors = copy.doors.filter((d) => d.warehouseId === warehouseId);
    if (warehouseDoors.some((d) => d.trailerId)) throw new Error('Cannot delete this warehouse because one or more doors still have trailers. Move the trailers first.');
    if (copy.tasks.some((t) => t.status !== 'Completed' && (t.sourceWarehouseId === warehouseId || t.destinationWarehouseId === warehouseId))) throw new Error('Cannot delete this warehouse because it has active shunter tasks.');
    copy.doors = copy.doors.filter((d) => d.warehouseId !== warehouseId);
    copy.warehouses = copy.warehouses.filter((w) => w.id !== warehouseId);
    addMovement(copy, `${warehouse.name} deleted with ${warehouseDoors.length} empty doors.`, user.id, null, 'audit');
  }, 'Warehouse deleted.');

  const updateDoor = (doorId, payload, user) => update((copy) => {
    const door = copy.doors.find((d) => d.id === doorId);
    if (!door) throw new Error('Door not found.');
    const code = payload.code.trim().toUpperCase();
    if (!payload.warehouseId || !code) throw new Error('Warehouse and door code are required.');
    if (copy.doors.some((d) => d.id !== doorId && d.warehouseId === payload.warehouseId && d.code.toLowerCase() === code.toLowerCase())) throw new Error('Door code already exists in this warehouse.');
    if (door.trailerId && payload.status === 'Maintenance') throw new Error('Cannot mark an occupied door as maintenance. Move the trailer first.');
    door.warehouseId = payload.warehouseId;
    door.code = code;
    door.status = door.trailerId ? 'Occupied' : payload.status;
    door.updatedAt = nowISO();
    const trailer = door.trailerId ? copy.trailers.find((t) => t.id === door.trailerId) : null;
    if (trailer) trailer.warehouseId = payload.warehouseId;
    addMovement(copy, `Door ${code} updated.`, user.id, trailer?.id || null, 'audit');
  }, 'Door updated.');

  const deleteDoor = (doorId, user) => update((copy) => {
    const door = copy.doors.find((d) => d.id === doorId);
    if (!door) throw new Error('Door not found.');
    if (door.trailerId) throw new Error('Cannot delete this door because it currently has a trailer. Move the trailer first.');
    if (copy.tasks.some((t) => t.status !== 'Completed' && (t.sourceDoorId === doorId || t.destinationDoorId === doorId))) throw new Error('Cannot delete this door because it is used by an active task.');
    copy.doors = copy.doors.filter((d) => d.id !== doorId);
    addMovement(copy, `Door ${door.code} deleted.`, user.id, null, 'audit');
  }, 'Door deleted.');

  const updateTrailer = (trailerId, payload, user) => update((copy) => {
    const trailer = copy.trailers.find((t) => t.id === trailerId);
    if (!trailer) throw new Error('Trailer not found.');
    const number = payload.number.trim().toUpperCase();
    if (!number) throw new Error('Trailer number is required.');
    if (copy.trailers.some((t) => t.id !== trailerId && t.number === number)) throw new Error('Trailer number already exists.');
    const nextDoor = payload.doorId ? copy.doors.find((d) => d.id === payload.doorId) : null;
    if (nextDoor && nextDoor.trailerId && nextDoor.trailerId !== trailerId) throw new Error('This door already has a trailer. One door can only have one trailer.');
    if (trailer.activeTaskId && nextDoor?.id !== trailer.doorId) throw new Error('Cannot manually move a trailer with an active task. Complete or cancel the task first.');
    if (trailer.doorId && trailer.doorId !== payload.doorId) {
      const oldDoor = copy.doors.find((d) => d.id === trailer.doorId);
      if (oldDoor) { oldDoor.trailerId = null; oldDoor.status = 'Empty'; oldDoor.updatedAt = nowISO(); }
    }
    trailer.number = number;
    trailer.plate = payload.plate.trim();
    trailer.companyId = payload.companyId;
    trailer.status = payload.status;
    trailer.warehouseId = nextDoor ? nextDoor.warehouseId : payload.warehouseId || null;
    trailer.doorId = nextDoor ? nextDoor.id : null;
    trailer.notes = payload.notes || '';
    trailer.lastMovedAt = nowISO();
    if (nextDoor) { nextDoor.trailerId = trailer.id; nextDoor.status = 'Occupied'; nextDoor.updatedAt = nowISO(); }
    addMovement(copy, `Trailer ${number} updated.`, user.id, trailer.id, 'audit');
  }, 'Trailer updated.');

  const deleteTrailer = (trailerId, user) => update((copy) => {
    const trailer = copy.trailers.find((t) => t.id === trailerId);
    if (!trailer) throw new Error('Trailer not found.');
    if (trailer.activeTaskId) throw new Error('Cannot delete this trailer because it has an active task. Complete the task first.');
    if (trailer.doorId) {
      const door = copy.doors.find((d) => d.id === trailer.doorId);
      if (door) { door.trailerId = null; door.status = 'Empty'; door.updatedAt = nowISO(); }
    }
    copy.trailers = copy.trailers.filter((t) => t.id !== trailerId);
    addMovement(copy, `Trailer ${trailer.number} deleted.`, user.id, trailer.id, 'audit');
  }, 'Trailer deleted.');

  const createRequest = (payload, user) => update((copy) => {
    const company = copy.companies.find((c) => c.id === user.companyId);
    const isPickup = payload.type === 'pickup';
    const requestId = `${isPickup ? 'PK' : 'ET'}-2026-${String(copy.requests.length + 1).padStart(6, '0')}`;
    const status = company?.autoApprove ? 'Assigned' : 'Pending Approval';
    const trailer = payload.trailerId ? copy.trailers.find((t) => t.id === payload.trailerId) : null;
    if (trailer?.activeTaskId) throw new Error('This trailer already has an active task.');
    const request = {
      id: requestId,
      type: payload.type,
      po: payload.po || '',
      reference: payload.reference || '',
      companyId: user.companyId,
      sourceWarehouseId: payload.sourceWarehouseId || null,
      destinationWarehouseId: payload.destinationWarehouseId || null,
      pallets: Number(payload.pallets || 0),
      trailerId: payload.trailerId || null,
      priority: payload.priority || 'Normal',
      status,
      approvalType: company?.autoApprove ? 'Auto Approved' : 'Manual',
      approvedBy: company?.autoApprove ? 'System' : null,
      requestedBy: user.id,
      createdAt: nowISO(),
      appointment: payload.appointment || '',
      notes: payload.notes || ''
    };
    copy.requests.unshift(request);
    addMovement(copy, `${company?.name || 'Requestor'} submitted ${request.id}. ${company?.autoApprove ? 'Auto approved.' : 'Waiting for admin approval.'}`, user.id, request.trailerId, 'request');

    if (company?.autoApprove) {
      let trailerId = request.trailerId;
      if (!trailerId && !isPickup) {
        const availableEmpty = copy.trailers.find((t) => t.companyId === user.companyId && t.status === 'Empty' && !t.activeTaskId);
        trailerId = availableEmpty?.id || null;
      }
      const sourceDoorId = trailerId ? copy.trailers.find((t) => t.id === trailerId)?.doorId || null : null;
      const sourceWarehouseId = request.sourceWarehouseId || (trailerId ? copy.trailers.find((t) => t.id === trailerId)?.warehouseId : null);
      const task = {
        id: uid('TASK'), requestId: request.id, type: request.type, companyId: request.companyId, assignedTo: null, status: 'Assigned',
        trailerId, sourceWarehouseId, sourceDoorId, destinationWarehouseId: request.destinationWarehouseId, destinationDoorId: null,
        po: request.po, pallets: request.pallets, notes: request.notes, dueTime: request.appointment || 'Today', createdAt: nowISO(), timestamps: { Assigned: nowISO() }
      };
      copy.tasks.unshift(task);
      request.status = 'Assigned';
      if (trailerId) copy.trailers.find((t) => t.id === trailerId).activeTaskId = task.id;
      addMovement(copy, `Auto-created ${task.id} for ${request.id}.`, 'system', trailerId, 'task');
    }
  }, 'Request submitted. RNF requests are auto-approved and sent to shunter tasks.');

  const approveAndAssign = (requestId, shunterId, trailerId, user) => update((copy) => {
    const req = copy.requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found.');
    if (!shunterId) throw new Error('Select a shunter.');
    if (trailerId) {
      const trailer = copy.trailers.find((t) => t.id === trailerId);
      if (trailer?.activeTaskId) throw new Error('Trailer already has an active task.');
      req.trailerId = trailerId;
    }
    const t = copy.trailers.find((x) => x.id === req.trailerId);
    const task = {
      id: uid('TASK'), requestId: req.id, type: req.type, companyId: req.companyId, assignedTo: shunterId, status: 'Assigned', trailerId: req.trailerId,
      sourceWarehouseId: req.sourceWarehouseId || t?.warehouseId || null, sourceDoorId: t?.doorId || null, destinationWarehouseId: req.destinationWarehouseId,
      destinationDoorId: null, po: req.po, pallets: req.pallets, notes: req.notes, dueTime: req.appointment || 'Today', createdAt: nowISO(), timestamps: { Assigned: nowISO() }
    };
    copy.tasks.unshift(task);
    req.status = 'Assigned'; req.approvalType = 'Manual Approved'; req.approvedBy = user.id;
    if (req.trailerId) t.activeTaskId = task.id;
    addMovement(copy, `${req.id} approved and assigned to shunter.`, user.id, req.trailerId, 'task');
  }, 'Request approved and assigned.');

  const updateTaskStatus = (taskId, nextStatus, destinationDoorId, user) => update((copy) => {
    const task = copy.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found.');
    const request = copy.requests.find((r) => r.id === task.requestId);
    const trailer = task.trailerId ? copy.trailers.find((t) => t.id === task.trailerId) : null;
    if (nextStatus === 'Picked Up' && trailer) {
      if (trailer.doorId) {
        const sourceDoor = copy.doors.find((d) => d.id === trailer.doorId);
        if (sourceDoor) { sourceDoor.trailerId = null; sourceDoor.status = 'Empty'; sourceDoor.updatedAt = nowISO(); }
      }
      trailer.status = 'In Transit'; trailer.warehouseId = null; trailer.doorId = null; trailer.lastMovedAt = nowISO();
    }
    if (nextStatus === 'Dropped') {
      if (!destinationDoorId) throw new Error('Select an available destination door before dropping.');
      const door = copy.doors.find((d) => d.id === destinationDoorId);
      if (!door || door.trailerId) throw new Error('Destination door is no longer available. One door can only have one trailer.');
      if (trailer) {
        door.trailerId = trailer.id; door.status = 'Occupied'; door.updatedAt = nowISO();
        trailer.warehouseId = door.warehouseId; trailer.doorId = door.id; trailer.status = task.type === 'empty' ? 'Empty' : 'Loaded'; trailer.lastMovedAt = nowISO();
      }
      task.destinationDoorId = destinationDoorId;
    }
    task.status = nextStatus;
    task.timestamps = task.timestamps || {};
    task.timestamps[nextStatus] = nowISO();
    if (request) request.status = nextStatus === 'Completed' ? 'Completed' : task.status;
    if (nextStatus === 'Completed' && trailer) trailer.activeTaskId = null;
    addMovement(copy, `${task.id} marked ${nextStatus}.`, user.id, trailer?.id || null, 'movement');
  }, `Task marked ${nextStatus}.`);

  const createInvite = (email, role, companyId, user) => update((copy) => {
    const token = Math.random().toString(36).slice(2, 12);
    copy.invitations.unshift({ id: uid('INV'), email, role, companyId, token, status: 'Pending', createdBy: user.id, createdAt: nowISO() });
    addMovement(copy, `Invitation created for ${email}.`, user.id, null, 'user');
  }, 'Invitation link created.');

  const resetDemo = () => {
    const seed = createSeed();
    setData(seed);
    saveToFirestore(seed).catch((error) => console.error('Firestore reset error:', error));
    setToast('Portal data reset.');
  };

  const visibleData = useMemo(() => mergePortalUsers(data, authUsers), [data, authUsers]);

  return { data: visibleData, dataReady, toast, addWarehouse, updateWarehouse, deleteWarehouse, addDoor, updateDoor, deleteDoor, addTrailer, updateTrailer, deleteTrailer, createRequest, approveAndAssign, updateTaskStatus, createInvite, resetDemo };
}

function iconForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complete')) return 'green';
  if (s.includes('assign') || s.includes('approve') || s.includes('transit')) return 'blue';
  if (s.includes('pending')) return 'orange';
  if (s.includes('maintenance') || s.includes('cancel')) return 'red';
  if (s.includes('reserved')) return 'yellow';
  return 'gray';
}

function roleLabel(role) {
  return role === 'rnf' ? 'RNF User' : role === 'admin' ? 'Admin' : 'Shunter';
}

export default function TrailerFlowApp() {
  const store = useTrailerData();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [loginRole, setLoginRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const companyToId = (company) => {
    const value = String(company || '').toLowerCase();
    if (value.includes('rnf')) return 'rnf';
    return 'hopewell';
  };

  const getPortalUser = async (firebaseUser) => {
    if (!db) throw new Error('Firebase database is not configured. Check Vercel environment variables.');
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!snap.exists()) throw new Error('No portal role was found for this account. Check Firestore users/{UID}.');

    const profile = snap.data();
    if (profile.active === false) throw new Error('This account is disabled. Contact the admin.');

    return {
      id: firebaseUser.uid,
      name: profile.name || firebaseUser.email || 'Portal User',
      email: profile.email || firebaseUser.email || '',
      role: profile.role || 'rnf',
      companyId: profile.companyId || companyToId(profile.company),
      active: profile.active !== false
    };
  };

  useEffect(() => {
    const forceLoginScreen = async () => {
      try {
        if (auth?.currentUser) {
          await signOut(auth);
        }
      } catch (error) {
        console.warn('Firebase sign out warning:', error);
      } finally {
        setUser(null);
        setLoginRole(null);
        setAuthReady(true);
      }
    };

    forceLoginScreen();
  }, []);

  const openLogin = (role) => {
    setLoginRole(role);
    setEmail(role === 'admin' ? 'admin@test.com' : role === 'rnf' ? 'rnf@test.com' : 'shunter@test.com');
    setPassword('');
    setAuthError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (!isFirebaseConfigured || !auth || !db) {
      setAuthError('Firebase is not connected yet. Check Vercel environment variables and redeploy.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setAuthError('Enter both email and password.');
      return;
    }

    try {
      setAuthBusy(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const portalUser = await getPortalUser(credential.user);

      if (loginRole && portalUser.role !== loginRole) {
        await signOut(auth);
        setUser(null);
        setAuthError(`This login is for ${roleLabel(portalUser.role)}, not ${roleLabel(loginRole)}.`);
        return;
      }

      setUser(portalUser);
      setPage('dashboard');
      setLoginRole(null);
      setPassword('');
    } catch (error) {
      console.error(error);
      setAuthError(cleanAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (auth?.currentUser) await signOut(auth);
    setUser(null);
    setPage('dashboard');
  };

  if (!authReady || !store.dataReady) {
    return <div className="landing"><div className="login-panel"><h2 className="panel-title">Loading HPW-RNF Portal...</h2><p className="panel-copy">Checking secure login and Firestore data.</p></div></div>;
  }

  if (!user) {
    return (
      <>
        <Landing data={store.data} openLogin={openLogin} />
        {loginRole ? (
          <LoginModal
            role={loginRole}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={authError}
            busy={authBusy}
            onClose={() => setLoginRole(null)}
            onSubmit={handleLogin}
          />
        ) : null}
      </>
    );
  }

  const nav = getNav(user.role);
  const currentPage = nav.some((n) => n.id === page) ? page : 'dashboard';

  return (
    <div className="portal">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🚛</div>
          <div>
            <div className="brand-title">TrailerFlow</div>
            <div className="brand-subtitle">Pro Control Portal</div>
          </div>
        </div>
        <div className="user-chip">
          <strong>{user.name}</strong>
          <span>{roleLabel(user.role)} • {store.data.companies.find((c) => c.id === user.companyId)?.name}</span>
        </div>
        <div className="side-label">Navigation</div>
        <div className="side-nav">
          {nav.map((item) => (
            <button key={item.id} className={`nav-item ${currentPage === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{nav.find((n) => n.id === currentPage)?.label || 'Dashboard'}</h1>
            <p>{topbarCopy(user.role, currentPage)}</p>
          </div>
          <div className="topbar-tools">
            <input className="search" placeholder="Search trailers, PO, warehouse..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="badge green">Online</span>
          </div>
        </div>
        <PageRouter user={user} page={currentPage} search={search} store={store} />
      </main>
      {store.toast ? <div className="toast">{store.toast}</div> : null}
    </div>
  );
}

function Landing({ data, openLogin }) {
  const stats = useMemo(() => ({
    trailers: data.trailers.length,
    whses: data.warehouses.length,
    doors: data.doors.length,
    active: data.tasks.filter((t) => t.status !== 'Completed').length
  }), [data]);
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand">
          <div className="brand-mark">🚛</div>
          <div>
            <div className="brand-title">TrailerFlow Pro</div>
            <div className="brand-subtitle">Internal trailer movement portal</div>
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn btn-soft" onClick={() => openLogin('admin')}>Admin Login</button>
          <button className="btn btn-green" onClick={() => openLogin('rnf')}>RNF Login</button>
          <button className="btn btn-purple" onClick={() => openLogin('shunter')}>Shunter Login</button>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-card">
          <div className="hero-eyebrow">⚡ Shared Hopewell / RNF Operations Portal</div>
          <h1>Modern yard visibility for intercompany trailer moves.</h1>
          <p>Book pickups, request empty trailers, assign shunter tasks, prevent double-booked doors, and give RNF live visibility of trailer locations from one clean portal.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => openLogin('admin')}>Admin Login</button>
            <button className="btn btn-ghost" onClick={() => openLogin('rnf')}>RNF Login</button>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric"><strong>{stats.trailers}</strong><span>Trailers</span></div>
            <div className="hero-metric"><strong>{stats.whses}</strong><span>WHSEs</span></div>
            <div className="hero-metric"><strong>{stats.doors}</strong><span>Doors</span></div>
            <div className="hero-metric"><strong>{stats.active}</strong><span>Active Tasks</span></div>
          </div>
        </div>
        <div className="login-panel">
          <h2 className="panel-title">Choose your portal</h2>
          <p className="panel-copy">This clean build is ready for GitHub and Vercel. It includes the modern role-based workflow we discussed.</p>
          <div className="role-grid">
            <button className="role-card" onClick={() => openLogin('admin')}>
              <span className="role-icon admin">👑</span><span><strong>Hopewell Admin</strong><span>Control center, WHSE setup, doors, trailers, assignments, reports.</span></span>
            </button>
            <button className="role-card" onClick={() => openLogin('rnf')}>
              <span className="role-icon rnf">🏢</span><span><strong>RNF User</strong><span>Book pickups, request empties, and view RNF trailer locations.</span></span>
            </button>
            <button className="role-card" onClick={() => openLogin('shunter')}>
              <span className="role-icon shunter">🚛</span><span><strong>Shunter</strong><span>Assigned tasks only. Start, arrive, pickup, drop, complete.</span></span>
            </button>
          </div>
          <div className="notice green">RNF requests are automatically approved and become shunter tasks. Non-auto-approved companies can be handled by Admin approval.</div>
        </div>
      </section>
      <section className="feature-strip">
        <div className="feature"><strong>One door, one trailer</strong><p>The app blocks assigning a trailer to an occupied door.</p></div>
        <div className="feature"><strong>RNF visibility</strong><p>RNF can view only RNF trailers and request history.</p></div>
        <div className="feature"><strong>Mobile shunter flow</strong><p>No charts. Just assigned work with large action buttons.</p></div>
        <div className="feature"><strong>Reports ready</strong><p>Export daily, weekly, monthly operations reports.</p></div>
      </section>
    </div>
  );
}


function cleanAuthError(error) {
  const message = String(error?.message || error || 'Login failed.');
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) return 'Invalid email or password.';
  if (message.includes('auth/too-many-requests')) return 'Too many login attempts. Try again later.';
  if (message.includes('auth/network-request-failed')) return 'Network error. Check your connection.';
  return message.replace('Firebase: ', '').replace(/\s*\(auth\/.+?\)\.?$/, '.');
}

function LoginModal({ role, email, setEmail, password, setPassword, error, busy, onClose, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.58)', padding: 20 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: 'min(460px, 100%)', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.30)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>{roleLabel(role)} Login</h2>
            <p className="card-sub">Enter your Firebase email and password to access the portal.</p>
          </div>
          <button type="button" className="btn btn-soft btn-small" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid one">
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@test.com" autoComplete="email" /></Field>
          <Field label="Password"><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" /></Field>
        </div>
        {error ? <div className="notice red">{error}</div> : null}
        <div className="form-actions">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button>
        </div>
      </form>
    </div>
  );
}

function getNav(role) {
  if (role === 'shunter') return [
    { id: 'dashboard', label: 'My Tasks', icon: '✅' },
    { id: 'taskHistory', label: 'Completed', icon: '📜' }
  ];
  if (role === 'rnf') return [
    { id: 'dashboard', label: 'RNF Dashboard', icon: '📊' },
    { id: 'bookPickup', label: 'Book Pickup', icon: '📦' },
    { id: 'emptyRequest', label: 'Request Empty', icon: '🚛' },
    { id: 'locations', label: 'Yard Visibility', icon: '🗺️' },
    { id: 'history', label: 'My Requests', icon: '📜' }
  ];
  return [
    { id: 'dashboard', label: 'Admin Control Center', icon: '📊' },
    { id: 'warehouses', label: 'Warehouses', icon: '🏢' },
    { id: 'doors', label: 'Doors', icon: '🚪' },
    { id: 'trailers', label: 'Trailers', icon: '🚛' },
    { id: 'requests', label: 'Requests', icon: '📦' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'users', label: 'Users & Invites', icon: '👥' },
    { id: 'reports', label: 'Reports', icon: '📄' }
  ];
}

function topbarCopy(role, page) {
  if (role === 'shunter') return 'Assigned jobs only. Follow the task steps and timestamps will be recorded.';
  if (role === 'rnf') return 'Create intercompany requests and view live yard map, warehouse overview, and door utilization.';
  if (page === 'dashboard') return 'Live yard status, open requests, shunter tasks and RNF activity.';
  return 'Manage the master data and workflow used by the portal.';
}

function PageRouter({ user, page, search, store }) {
  if (user.role === 'shunter') {
    return page === 'taskHistory'
      ? <ShunterTasks user={user} store={store} completedOnly search={search} />
      : <ShunterTasks user={user} store={store} search={search} />;
  }
  if (user.role === 'rnf') {
    if (page === 'bookPickup') return <RequestForm user={user} store={store} type="pickup" />;
    if (page === 'emptyRequest') return <RequestForm user={user} store={store} type="empty" />;
    if (page === 'locations') return <RNFYardVisibilityPage user={user} store={store} search={search} />;
    if (page === 'history') return <RequestHistory user={user} store={store} />;
    return <RNFDashboard user={user} store={store} search={search} />;
  }
  if (page === 'warehouses') return <Warehouses user={user} store={store} />;
  if (page === 'doors') return <Doors user={user} store={store} />;
  if (page === 'trailers') return <Trailers user={user} store={store} search={search} />;
  if (page === 'requests') return <AdminRequests user={user} store={store} />;
  if (page === 'tasks') return <AdminTasks user={user} store={store} search={search} />;
  if (page === 'users') return <UsersInvites user={user} store={store} />;
  if (page === 'reports') return <Reports user={user} store={store} />;
  return <AdminDashboard user={user} store={store} search={search} />;
}

function getStats(data, companyId = null) {
  const trailers = companyId ? data.trailers.filter((t) => t.companyId === companyId) : data.trailers;
  const requests = companyId ? data.requests.filter((r) => r.companyId === companyId) : data.requests;
  const tasks = companyId ? data.tasks.filter((t) => t.companyId === companyId) : data.tasks;
  return {
    trailers: trailers.length,
    loaded: trailers.filter((t) => t.status === 'Loaded').length,
    empty: trailers.filter((t) => t.status === 'Empty').length,
    transit: trailers.filter((t) => t.status === 'In Transit').length,
    openRequests: requests.filter((r) => r.status !== 'Completed').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
    activeTasks: tasks.filter((t) => t.status !== 'Completed').length,
    occupiedDoors: data.doors.filter((d) => d.trailerId).length,
    totalDoors: data.doors.length
  };
}

function DashboardDesignStyles() {
  return <style>{`
    .tf2-dashboard { display: flex; flex-direction: column; gap: 18px; }
    .tf2-hero { position: relative; overflow: hidden; border-radius: 28px; padding: 24px; background: radial-gradient(circle at 15% 10%, rgba(34,197,94,.24), transparent 32%), linear-gradient(135deg, #07111f 0%, #0f2442 52%, #133b63 100%); color: #fff; box-shadow: 0 22px 55px rgba(15, 23, 42, .22); }
    .tf2-hero:after { content: ''; position: absolute; width: 260px; height: 260px; border-radius: 50%; right: -95px; top: -80px; background: rgba(59,130,246,.25); filter: blur(2px); }
    .tf2-hero-content { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
    .tf2-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px; background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.18); font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .tf2-hero h2 { margin: 12px 0 6px; font-size: clamp(28px, 3vw, 44px); line-height: 1.02; letter-spacing: -.04em; }
    .tf2-hero p { margin: 0; color: rgba(255,255,255,.78); max-width: 720px; line-height: 1.6; }
    .tf2-hero-side { display: grid; gap: 10px; min-width: 180px; }
    .tf2-live-chip { display: flex; justify-content: space-between; gap: 14px; padding: 12px 14px; border-radius: 18px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(10px); }
    .tf2-live-chip span { color: rgba(255,255,255,.72); font-size: 12px; }
    .tf2-live-chip strong { font-size: 18px; }
    .tf2-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
    .tf2-kpi { position: relative; overflow: hidden; border: 1px solid rgba(148,163,184,.18); border-radius: 24px; padding: 18px; background: linear-gradient(180deg, #fff, #f8fafc); box-shadow: 0 14px 30px rgba(15,23,42,.08); min-height: 128px; }
    .tf2-kpi:after { content: ''; position: absolute; right: -22px; bottom: -26px; width: 92px; height: 92px; border-radius: 999px; background: var(--tf2-accent-soft); }
    .tf2-kpi-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; position: relative; z-index: 1; }
    .tf2-kpi-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 16px; background: var(--tf2-accent); color: #fff; box-shadow: 0 12px 24px var(--tf2-accent-shadow); }
    .tf2-kpi-label { margin-top: 14px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; position: relative; z-index: 1; }
    .tf2-kpi-value { font-size: 32px; line-height: 1; margin-top: 7px; font-weight: 900; color: #0f172a; position: relative; z-index: 1; letter-spacing: -.05em; }
    .tf2-kpi-note { font-size: 12px; color: #64748b; margin-top: 8px; position: relative; z-index: 1; }
    .tf2-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(340px, .9fr); gap: 16px; align-items: stretch; }
    .tf2-card { border-radius: 26px; background: rgba(255,255,255,.94); border: 1px solid rgba(148,163,184,.20); box-shadow: 0 14px 38px rgba(15,23,42,.08); overflow: hidden; }
    .tf2-card.pad { padding: 18px; }
    .tf2-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px 18px 10px; }
    .tf2-card-title { margin: 0; font-size: 18px; letter-spacing: -.02em; color: #0f172a; }
    .tf2-card-sub { margin: 4px 0 0; color: #64748b; font-size: 13px; line-height: 1.45; }
    .tf2-card-body { padding: 0 18px 18px; }
    .tf2-stack { display: grid; gap: 16px; }
    .tf2-mini-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .tf2-mini { border-radius: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .tf2-mini strong { display: block; color: #0f172a; font-size: 22px; letter-spacing: -.03em; }
    .tf2-mini span { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .tf2-progress { height: 8px; border-radius: 999px; background: #e2e8f0; margin-top: 12px; overflow: hidden; }
    .tf2-progress > i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22c55e, #38bdf8); }
    .tf2-warehouse-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .tf2-whse { border-radius: 20px; padding: 14px; background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid #e2e8f0; }
    .tf2-whse-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .tf2-whse-name { font-weight: 900; color: #0f172a; }
    .tf2-whse-code { color: #64748b; font-size: 12px; }
    .tf2-activity { display: grid; gap: 10px; max-height: 420px; overflow: auto; padding-right: 3px; }
    .tf2-activity-item { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 12px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .tf2-activity-icon { width: 42px; height: 42px; border-radius: 15px; display: grid; place-items: center; background: #e0f2fe; color: #0369a1; }
    .tf2-activity strong { display: block; color: #0f172a; font-size: 13px; line-height: 1.35; }
    .tf2-activity span { display: block; color: #64748b; font-size: 12px; margin-top: 3px; }
    .tf2-time { text-align: right; color: #64748b; font-size: 11px; white-space: nowrap; }
    .tf2-task-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
    .tf2-task-table th { text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; padding: 0 12px; }
    .tf2-task-table td { padding: 13px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .tf2-task-table td:first-child { border-left: 1px solid #e2e8f0; border-radius: 16px 0 0 16px; }
    .tf2-task-table td:last-child { border-right: 1px solid #e2e8f0; border-radius: 0 16px 16px 0; }
    .tf2-status { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 800; background: #eef2ff; color: #3730a3; }
    .tf2-status.green { background: #dcfce7; color: #166534; } .tf2-status.orange { background: #ffedd5; color: #9a3412; } .tf2-status.red { background: #fee2e2; color: #991b1b; } .tf2-status.gray { background: #f1f5f9; color: #475569; } .tf2-status.blue { background: #dbeafe; color: #1d4ed8; } .tf2-status.purple { background: #f3e8ff; color: #6b21a8; } .tf2-status.yellow { background: #fef9c3; color: #854d0e; }
    .tf2-yard { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .tf2-yard-whse { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid rgba(148,163,184,.22); background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); padding: 16px; box-shadow: 0 16px 34px rgba(15,23,42,.08); }
    .tf2-yard-whse:after { content: ''; position: absolute; right: -28px; top: -24px; width: 120px; height: 120px; border-radius: 999px; background: rgba(59,130,246,.08); }
    .tf2-yard-head { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
    .tf2-yard-head-left { display: grid; gap: 8px; }
    .tf2-yard-substats { display: flex; flex-wrap: wrap; gap: 8px; }
    .tf2-yard-stat { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 7px 11px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 800; border: 1px solid #bfdbfe; }
    .tf2-yard-stat.green { background: #ecfdf5; color: #15803d; border-color: #bbf7d0; }
    .tf2-yard-stat.purple { background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe; }
    .tf2-door-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .tf2-door { min-height: 118px; border-radius: 18px; padding: 12px; font-size: 11px; border: 1px solid #e2e8f0; background: linear-gradient(180deg, #f8fafc, #ffffff); box-shadow: inset 0 1px 0 rgba(255,255,255,.8); display: flex; flex-direction: column; justify-content: space-between; gap: 10px; }
    .tf2-door.occupied { background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%); border-color: #86efac; box-shadow: 0 10px 18px rgba(34,197,94,.10); } .tf2-door.maintenance { background: linear-gradient(180deg, #fef2f2 0%, #ffffff 100%); border-color: #fecaca; } .tf2-door.reserved { background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%); border-color: #fde68a; } .tf2-door.empty { background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); border-color: #bfdbfe; }
    .tf2-door-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .tf2-door-code { display: grid; gap: 2px; font-weight: 900; color: #0f172a; }
    .tf2-door-code small { color: #64748b; font-size: 10px; font-weight: 700; }
    .tf2-door-state { width: 30px; height: 30px; border-radius: 12px; display: grid; place-items: center; font-size: 15px; background: rgba(255,255,255,.9); border: 1px solid rgba(148,163,184,.16); }
    .tf2-door-detail { color: #475569; line-height: 1.3; display: grid; gap: 6px; }
    .tf2-door-detail strong { font-size: 15px; color: #0f172a; letter-spacing: -.02em; }
    .tf2-door-detail .muted { color: #64748b; font-size: 11px; }
    .tf2-door-pill { display: inline-flex; align-items: center; justify-content: center; align-self: flex-start; border-radius: 999px; padding: 6px 10px; background: rgba(15,23,42,.06); color: #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
    .tf2-door.occupied .tf2-door-pill { background: #dcfce7; color: #166534; }
    .tf2-door.reserved .tf2-door-pill { background: #fef3c7; color: #92400e; }
    .tf2-door.maintenance .tf2-door-pill { background: #fee2e2; color: #991b1b; }
    .tf2-door.empty .tf2-door-pill { background: #dbeafe; color: #1d4ed8; }
    @media (max-width: 1180px) { .tf2-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tf2-layout, .tf2-warehouse-grid, .tf2-yard { grid-template-columns: 1fr; } .tf2-hero-content { flex-direction: column; } }
    @media (max-width: 720px) { .tf2-mini-grid, .tf2-door-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tf2-kpi-grid { grid-template-columns: 1fr; } }
  `}</style>;
}

function Panel({ title, subtitle, right, children, padded = false }) {
  return <div className={`tf2-card ${padded ? 'pad' : ''}`}>
    <div className="tf2-card-head">
      <div><h2 className="tf2-card-title">{title}</h2>{subtitle ? <p className="tf2-card-sub">{subtitle}</p> : null}</div>
      {right || null}
    </div>
    <div className="tf2-card-body">{children}</div>
  </div>;
}

function StatusPill({ value }) {
  return <span className={`tf2-status ${iconForStatus(value)}`}>{value || 'Open'}</span>;
}

function userName(data, userId) {
  if (!userId) return 'System';
  if (userId === 'system') return 'System';
  if (userId === 'u-shunter') return 'Unassigned / Queue';
  return data.users?.find((u) => u.id === userId)?.name || 'Portal User';
}

function locationName(data, warehouseId, doorId) {
  const warehouse = data.warehouses.find((w) => w.id === warehouseId)?.name || 'Yard';
  const door = doorId ? data.doors.find((d) => d.id === doorId)?.code : '';
  return door ? `${warehouse} • Door ${door}` : warehouse;
}

function StatCards({ stats, role }) {
  const cards = role === 'rnf'
    ? [
      ['Active Trailers', stats.trailers, '🚛', '#2563eb', 'RNF trailer fleet'], ['Loaded', stats.loaded, '📦', '#16a34a', 'Ready / staged'], ['Empty', stats.empty, '⬜', '#7c3aed', 'Available empties'], ['In Transit', stats.transit, '➡️', '#ea580c', 'Currently moving'], ['Open Requests', stats.openRequests, '📋', '#0891b2', 'Needs execution']
    ]
    : [
      ['Total Trailers', stats.trailers, '🚛', '#2563eb', 'All controlled units'], ['Occupied Doors', `${stats.occupiedDoors}/${stats.totalDoors}`, '🚪', '#16a34a', 'Current occupancy'], ['Active Tasks', stats.activeTasks, '✅', '#7c3aed', 'Assigned/in progress'], ['Open Requests', stats.openRequests, '📋', '#ea580c', 'Pending completion'], ['Completed', stats.completed, '✔️', '#059669', 'Finished requests']
    ];
  return <div className="tf2-kpi-grid">{cards.map(([label, value, icon, color, note]) => <div className="tf2-kpi" key={label} style={{ '--tf2-accent': color, '--tf2-accent-soft': `${color}18`, '--tf2-accent-shadow': `${color}35` }}>
    <div className="tf2-kpi-top"><div className="tf2-kpi-icon">{icon}</div><StatusPill value={label.includes('Open') ? 'Active' : label.includes('Completed') ? 'Completed' : 'Online'} /></div>
    <div className="tf2-kpi-label">{label}</div><div className="tf2-kpi-value">{value}</div><div className="tf2-kpi-note">{note}</div>
  </div>)}</div>;
}

function DashboardHero({ data, role = 'admin' }) {
  const activeTasks = data.tasks.filter((t) => t.status !== 'Completed').length;
  const occupied = data.doors.filter((d) => d.trailerId).length;
  const title = role === 'rnf' ? 'RNF trailer visibility center' : 'HPW-RNF operations control center';
  const copy = role === 'rnf'
    ? 'Track RNF trailer locations, active requests, and shunter progress from one clean dashboard.'
    : 'Monitor WHSE occupancy, open requests, shunter tasks, and recent movement activity in real time.';
  return <div className="tf2-hero">
    <div className="tf2-hero-content">
      <div><div className="tf2-eyebrow">● Firestore Live • HPW-RNF Portal</div><h2>{title}</h2><p>{copy}</p></div>
      <div className="tf2-hero-side">
        <div className="tf2-live-chip"><span>Active tasks</span><strong>{activeTasks}</strong></div>
        <div className="tf2-live-chip"><span>Door occupancy</span><strong>{occupied}/{data.doors.length}</strong></div>
        <div className="tf2-live-chip"><span>Last refresh</span><strong>{timeOnly(nowISO())}</strong></div>
      </div>
    </div>
  </div>;
}

function AdminDashboard({ store }) {
  const { data } = store;
  const stats = getStats(data);
  return <div className="tf2-dashboard">
    <DashboardDesignStyles />
    <DashboardHero data={data} />
    <StatCards stats={stats} />
    <div className="tf2-layout">
      <Panel title="Live trailer map" subtitle="Warehouse doors, occupancy, and trailer status." right={<StatusPill value="Online" />}><YardMap data={data} /></Panel>
      <div className="tf2-stack">
        <Panel title="Trailer status" subtitle="Current fleet condition."><TrailerStatusPanel data={data} /></Panel>
        <Panel title="Recent activity" subtitle="Who did what, with timestamps."><ActivityList data={data} /></Panel>
      </div>
    </div>
    <WarehouseOverview data={data} />
    <div className="tf2-layout">
      <Panel title="Open requests" subtitle="Pickup and empty trailer requests waiting to finish."><RequestsTable data={data} limit={6} /></Panel>
      <Panel title="Active shunter tasks" subtitle="Work currently assigned or in progress."><TasksMini data={data} /></Panel>
    </div>
  </div>;
}

function RNFDashboard({ user, store, search }) {
  const { data } = store;
  const stats = getStats(data, user.companyId);
  return <div className="tf2-dashboard">
    <DashboardDesignStyles />
    <DashboardHero data={data} role="rnf" />
    <StatCards stats={stats} role="rnf" />

    <div className="tf2-layout">
      <Panel
        title="Live trailer map"
        subtitle="Same yard visibility as HPW: all WHSE doors, occupied locations, empty doors, reserved doors, and maintenance doors."
        right={<StatusPill value="Online" />}
      >
        <YardMap data={data} />
      </Panel>

      <div className="tf2-stack">
        <Panel title="Door utilization by WHSE" subtitle="Occupied vs open door count across every warehouse.">
          <WarehouseUtilizationMini data={data} />
        </Panel>
        <Panel title="Recent activity" subtitle="Latest trailer movement and request activity.">
          <ActivityList data={data} />
        </Panel>
      </div>
    </div>

    <WarehouseOverview data={data} />

    <div className="tf2-layout">
      <Panel title="My active requests" subtitle="Auto-approved RNF requests and current status.">
        <RequestHistory user={user} store={store} compact />
      </Panel>
      <Panel title="RNF trailer status" subtitle="Loaded, empty, maintenance, and in-transit count.">
        <TrailerStatusPanel data={data} companyId={user.companyId} />
      </Panel>
    </div>
  </div>;
}

function RNFYardVisibilityPage({ user, store, search }) {
  const { data } = store;
  return <div className="tf2-dashboard">
    <DashboardDesignStyles />
    <DashboardHero data={data} role="rnf" />

    <div className="tf2-layout">
      <Panel
        title="Live trailer map"
        subtitle="All WHSE doors are visible, including occupied, empty, reserved, and maintenance doors."
        right={<StatusPill value="Online" />}
      >
        <YardMap data={data} />
      </Panel>

      <div className="tf2-stack">
        <Panel title="Door utilization by WHSE" subtitle="Same utilization view as HPW/Admin.">
          <WarehouseUtilizationMini data={data} />
        </Panel>
        <Panel title="Recent activity" subtitle="Latest request and trailer movement activity.">
          <ActivityList data={data} />
        </Panel>
      </div>
    </div>

    <WarehouseOverview data={data} />

    <div className="tf2-layout">
      <Panel title="My active requests" subtitle="RNF pickup and empty trailer request status.">
        <RequestHistory user={user} store={store} compact />
      </Panel>
      <Panel title="RNF trailer status" subtitle="Loaded, empty, maintenance, and in-transit count.">
        <TrailerStatusPanel data={data} companyId={user.companyId} />
      </Panel>
    </div>
  </div>;
}

function WarehouseUtilizationMini({ data }) {
  return <div className="tf2-stack">
    {data.warehouses.map((w) => {
      const doors = data.doors.filter((d) => d.warehouseId === w.id);
      const occupied = doors.filter((d) => d.trailerId).length;
      const maintenance = doors.filter((d) => d.status === 'Maintenance').length;
      const open = doors.length - occupied - maintenance;
      const pct = doors.length ? Math.round((occupied / doors.length) * 100) : 0;
      return <div key={w.id}>
        <div className="tf2-whse-row">
          <div>
            <span className="tf2-whse-name">{w.name}</span>
            <div className="tf2-whse-code">{occupied} occupied • {open} open • {maintenance} maintenance</div>
          </div>
          <StatusPill value={`${pct}% used`} />
        </div>
        <div className="tf2-progress"><i style={{ width: `${pct}%` }} /></div>
      </div>;
    })}
  </div>;
}

function WarehouseOverview({ data }) {
  return <Panel title="Warehouse overview" subtitle="Door utilization by WHSE.">
    <div className="tf2-warehouse-grid">
      {data.warehouses.map((w) => {
        const doors = data.doors.filter((d) => d.warehouseId === w.id);
        const occupied = doors.filter((d) => d.trailerId).length;
        const pct = doors.length ? Math.round((occupied / doors.length) * 100) : 0;
        return <div className="tf2-whse" key={w.id}>
          <div className="tf2-whse-row"><div><div className="tf2-whse-name">{w.name}</div><div className="tf2-whse-code">Code {w.code}</div></div><StatusPill value={pct >= 85 ? 'High' : pct >= 50 ? 'Active' : 'Open'} /></div>
          <div className="tf2-progress"><i style={{ width: `${pct}%` }} /></div>
          <div className="tf2-mini-grid" style={{ marginTop: 12 }}>
            <div className="tf2-mini"><strong>{occupied}</strong><span>Occupied</span></div>
            <div className="tf2-mini"><strong>{doors.length - occupied}</strong><span>Open</span></div>
            <div className="tf2-mini"><strong>{pct}%</strong><span>Used</span></div>
          </div>
        </div>;
      })}
    </div>
  </Panel>;
}

function TrailerStatusPanel({ data, companyId = null }) {
  const trailers = companyId ? data.trailers.filter((t) => t.companyId === companyId) : data.trailers;
  const statuses = ['Loaded', 'Empty', 'In Transit', 'Maintenance'];
  return <div className="tf2-stack">
    {statuses.map((status) => {
      const count = trailers.filter((t) => t.status === status).length;
      const pct = trailers.length ? Math.round((count / trailers.length) * 100) : 0;
      return <div key={status}>
        <div className="tf2-whse-row"><span className="tf2-whse-name">{status}</span><StatusPill value={`${count} trailers`} /></div>
        <div className="tf2-progress"><i style={{ width: `${pct}%` }} /></div>
      </div>;
    })}
  </div>;
}

function YardMap({ data, companyId = null }) {
  const trailersById = Object.fromEntries(data.trailers.map((t) => [t.id, t]));
  const companyById = Object.fromEntries(data.companies.map((c) => [c.id, c]));
  return <div className="tf2-yard">
    {data.warehouses.map((w) => {
      const doors = data.doors.filter((d) => d.warehouseId === w.id);
      const visibleDoors = companyId ? doors.filter((d) => !d.trailerId || trailersById[d.trailerId]?.companyId === companyId) : doors;
      const occupiedCount = visibleDoors.filter((d) => d.trailerId).length;
      const emptyCount = visibleDoors.filter((d) => !d.trailerId && d.status !== 'Maintenance').length;
      const rnfCount = visibleDoors.filter((d) => d.trailerId && trailersById[d.trailerId]?.companyId === companyId).length;
      return <div className="tf2-yard-whse" key={w.id}>
        <div className="tf2-yard-head">
          <div className="tf2-yard-head-left">
            <div><div className="tf2-whse-name">{w.name}</div><div className="tf2-whse-code">{w.address || `Code ${w.code}`}</div></div>
            <div className="tf2-yard-substats">
              <span className="tf2-yard-stat">🚪 {occupiedCount}/{visibleDoors.length || 0} occupied</span>
              <span className="tf2-yard-stat green">✨ {emptyCount} open doors</span>
              {companyId ? <span className="tf2-yard-stat purple">🚛 {rnfCount} RNF trailers</span> : null}
            </div>
          </div>
          <StatusPill value={`${occupiedCount}/${visibleDoors.length || 0}`} />
        </div>
        <div className="tf2-door-grid">
          {visibleDoors.map((d) => {
            const t = d.trailerId ? trailersById[d.trailerId] : null;
            const css = d.status === 'Maintenance' ? 'maintenance' : d.trailerId ? 'occupied' : d.status === 'Reserved' ? 'reserved' : 'empty';
            const icon = d.status === 'Maintenance' ? '🛠️' : d.trailerId ? '🚛' : d.status === 'Reserved' ? '🕒' : '✨';
            return <div className={`tf2-door ${css}`} key={d.id}>
              <div className="tf2-door-top">
                <div className="tf2-door-code"><span>{d.code}</span><small>{w.code} door</small></div>
                <div className="tf2-door-state">{icon}</div>
              </div>
              <div className="tf2-door-detail">{t ? <><strong>{t.number}</strong><span className="muted">{companyById[t.companyId]?.name}</span><span className="muted">{t.status}</span></> : <><strong>{d.status === 'Maintenance' ? 'Maintenance' : d.status === 'Reserved' ? 'Reserved' : 'Empty Door'}</strong><span className="muted">{d.status === 'Maintenance' ? 'Unavailable for moves' : d.status === 'Reserved' ? 'Held for an upcoming move' : 'Available for trailer assignment'}</span></>}</div>
              <div className="tf2-door-pill">{t ? 'Trailer on door' : d.status === 'Maintenance' ? 'Blocked' : d.status === 'Reserved' ? 'Reserved' : 'Available'}</div>
            </div>;
          })}
        </div>
      </div>;
    })}
  </div>;
}

function ActivityList({ data }) {
  const rows = data.movements.slice(0, 10);
  if (!rows.length) return <div className="empty-state">No recent activity yet.</div>;
  return <div className="tf2-activity">
    {rows.map((m) => {
      const trailer = m.trailerId ? data.trailers.find((t) => t.id === m.trailerId) : null;
      return <div className="tf2-activity-item" key={m.id}>
        <div className="tf2-activity-icon">{m.type === 'task' ? '✅' : m.type === 'request' ? '📦' : m.type === 'movement' ? '🚛' : '↔️'}</div>
        <div><strong>{m.message}</strong><span>{userName(data, m.userId)} • {trailer ? `Trailer ${trailer.number}` : 'System activity'}</span></div>
        <div className="tf2-time"><strong>{timeOnly(m.createdAt)}</strong><br />{dateOnly(m.createdAt)}</div>
      </div>;
    })}
  </div>;
}

function RequestsTable({ data, limit = 999 }) {
  const rows = data.requests.filter((r) => r.status !== 'Completed').slice(0, limit);
  if (!rows.length) return <div className="empty-state">No open requests.</div>;
  return <div className="table-wrap"><table className="tf2-task-table"><thead><tr><th>Request</th><th>Company</th><th>Route</th><th>Status</th><th>PO</th></tr></thead><tbody>
    {rows.map((r) => <tr key={r.id}>
      <td><strong>{r.id}</strong><br /><small>{r.type}</small></td>
      <td>{data.companies.find((c) => c.id === r.companyId)?.name}</td>
      <td>{locationName(data, r.sourceWarehouseId, null)} → {locationName(data, r.destinationWarehouseId, null)}</td>
      <td><StatusPill value={r.status} /></td>
      <td>{r.po || '-'}</td>
    </tr>)}
  </tbody></table></div>;
}

function TasksMini({ data }) {
  const rows = data.tasks.filter((t) => t.status !== 'Completed').slice(0, 8);
  if (!rows.length) return <div className="empty-state">No active shunter tasks.</div>;
  return <div className="table-wrap"><table className="tf2-task-table"><thead><tr><th>Task</th><th>Trailer</th><th>Route</th><th>Assigned To</th><th>Status</th></tr></thead><tbody>
    {rows.map((t) => <tr key={t.id}>
      <td><strong>{t.id}</strong><br /><small>{t.po || 'No PO'} • {t.pallets || 0} pallets</small></td>
      <td>{data.trailers.find((x) => x.id === t.trailerId)?.number || 'TBD'}</td>
      <td>{locationName(data, t.sourceWarehouseId, t.sourceDoorId)} → {locationName(data, t.destinationWarehouseId, t.destinationDoorId)}</td>
      <td>{userName(data, t.assignedTo)}</td>
      <td><StatusPill value={t.status} /></td>
    </tr>)}
  </tbody></table></div>;
}

function Warehouses({ user, store }) {
  const blank = { name: '', code: '', address: '', doors: 0, active: true };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  const startEdit = (warehouse) => {
    setEditingId(warehouse.id);
    setForm({ name: warehouse.name, code: warehouse.code, address: warehouse.address || '', doors: 0, active: warehouse.active });
  };
  const cancelEdit = () => { setEditingId(null); setForm(blank); };
  const save = () => {
    try {
      if (editingId) {
        store.updateWarehouse(editingId, form, user);
        cancelEdit();
      } else {
        store.addWarehouse(form, user);
        setForm(blank);
      }
    } catch (e) { alert(e.message); }
  };
  const remove = (warehouse) => {
    if (!confirm(`Delete ${warehouse.name}? This will also delete its empty doors.`)) return;
    try { store.deleteWarehouse(warehouse.id, user); } catch (e) { alert(e.message); }
  };

  return <div className="grid-2">
    <div className="card"><h2>{editingId ? 'Edit Warehouse Location' : 'Create Warehouse Location'}</h2><p className="card-sub">Admin creates and maintains real WHSE locations. Delete is blocked when doors have trailers or active tasks.</p><div className="form-grid">
      <Field label="WHSE Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="WHSE G" /></Field>
      <Field label="Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="G" /></Field>
      <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Warehouse address" /></Field>
      {!editingId ? <Field label="Initial Doors"><input type="number" min="0" value={form.doors} onChange={(e) => setForm({ ...form, doors: e.target.value })} /></Field> : <Field label="Status"><select value={form.active ? 'Active' : 'Inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'Active' })}><option>Active</option><option>Inactive</option></select></Field>}
    </div><div className="form-actions">{editingId ? <button className="btn btn-soft" onClick={cancelEdit}>Cancel</button> : null}<button className="btn btn-primary" onClick={save}>{editingId ? 'Update Warehouse' : 'Create Warehouse'}</button></div></div>
    <div className="card"><h2>Warehouse List</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Doors</th><th>Occupied</th><th>Actions</th></tr></thead><tbody>{store.data.warehouses.map((w) => { const doors = store.data.doors.filter((d) => d.warehouseId === w.id); return <tr key={w.id}><td><strong>{w.name}</strong><br /><small>{w.address}</small></td><td>{w.code}</td><td>{doors.length}</td><td>{doors.filter((d) => d.trailerId).length}</td><td><div className="table-actions"><button className="btn btn-soft btn-small" onClick={() => startEdit(w)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => remove(w)}>Delete</button></div></td></tr>; })}</tbody></table></div></div>
  </div>;
}


function Doors({ user, store }) {
  const firstWarehouse = store.data.warehouses[0]?.id || '';
  const blank = { warehouseId: firstWarehouse, code: '', status: 'Empty' };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  useEffect(() => {
    if (!form.warehouseId && firstWarehouse) setForm((prev) => ({ ...prev, warehouseId: firstWarehouse }));
  }, [firstWarehouse, form.warehouseId]);

  const startEdit = (door) => {
    setEditingId(door.id);
    setForm({ warehouseId: door.warehouseId, code: door.code, status: door.status });
  };
  const cancelEdit = () => { setEditingId(null); setForm({ warehouseId: firstWarehouse, code: '', status: 'Empty' }); };
  const save = () => {
    try {
      if (editingId) {
        store.updateDoor(editingId, form, user);
        cancelEdit();
      } else {
        store.addDoor(form.warehouseId, form.code, user);
        setForm({ ...form, code: '' });
      }
    } catch (e) { alert(e.message); }
  };
  const remove = (door) => {
    if (!confirm(`Delete door ${door.code}?`)) return;
    try { store.deleteDoor(door.id, user); } catch (e) { alert(e.message); }
  };

  return <div className="section-stack">
    <div className="card"><h2>{editingId ? 'Edit Door' : 'Add Door'}</h2><p className="card-sub">Doors can be edited or deleted only when the logic allows it. Occupied doors cannot be deleted.</p><div className="form-grid">
      <Field label="Warehouse"><select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>{store.data.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
      <Field label="Door Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A9" /></Field>
      {editingId ? <Field label="Door Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Empty</option><option>Reserved</option><option>Maintenance</option></select></Field> : null}
    </div><div className="form-actions">{editingId ? <button className="btn btn-soft" onClick={cancelEdit}>Cancel</button> : null}<button className="btn btn-primary" onClick={save}>{editingId ? 'Update Door' : 'Add Door'}</button></div></div>
    <div className="card"><h2>Door List</h2><p className="card-sub">Business rule: one door can only have one trailer.</p><div className="table-wrap"><table><thead><tr><th>Door</th><th>Warehouse</th><th>Status</th><th>Trailer</th><th>Actions</th></tr></thead><tbody>{store.data.doors.map((d) => { const trailer = store.data.trailers.find((t) => t.id === d.trailerId); return <tr key={d.id}><td><strong>{d.code}</strong></td><td>{store.data.warehouses.find((w) => w.id === d.warehouseId)?.name}</td><td><span className={`badge ${iconForStatus(d.status)}`}>{d.status}</span></td><td>{trailer?.number || '-'}</td><td><div className="table-actions"><button className="btn btn-soft btn-small" onClick={() => startEdit(d)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => remove(d)}>Delete</button></div></td></tr>; })}</tbody></table></div></div>
    <div className="card"><h2>Door Occupancy Map</h2><YardMap data={store.data} /></div>
  </div>;
}


function Trailers({ user, store, search }) {
  const data = store.data;
  const blank = { number: '', plate: '', companyId: 'rnf', status: 'Empty', warehouseId: '', doorId: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const availableDoors = data.doors.filter((d) => (!d.trailerId || d.trailerId === editingId) && (!form.warehouseId || d.warehouseId === form.warehouseId) && d.status !== 'Maintenance');
  const startEdit = (trailer) => {
    setEditingId(trailer.id);
    setForm({ number: trailer.number, plate: trailer.plate || '', companyId: trailer.companyId, status: trailer.status, warehouseId: trailer.warehouseId || '', doorId: trailer.doorId || '', notes: trailer.notes || '' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(blank); };
  const save = () => {
    try {
      if (editingId) {
        store.updateTrailer(editingId, form, user);
        cancelEdit();
      } else {
        store.addTrailer(form, user);
        setForm(blank);
      }
    } catch (e) { alert(e.message); }
  };
  const remove = (trailer) => {
    if (!confirm(`Delete trailer ${trailer.number}?`)) return;
    try { store.deleteTrailer(trailer.id, user); } catch (e) { alert(e.message); }
  };
  const filtered = data.trailers.filter((t) => `${t.number} ${t.plate} ${data.warehouses.find((w) => w.id === t.warehouseId)?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="section-stack">
    <div className="card"><h2>{editingId ? 'Edit Trailer' : 'Create Trailer Number'}</h2><p className="card-sub">Edit trailer status/location. The app blocks duplicate trailer numbers and occupied doors.</p><div className="form-grid">
      <Field label="Trailer Number"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="TR-031" /></Field>
      <Field label="Plate"><input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="Optional" /></Field>
      <Field label="Company"><select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>{data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Empty</option><option>Loaded</option><option>Maintenance</option><option>In Transit</option></select></Field>
      <Field label="Warehouse"><select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value, doorId: '' })}><option value="">No location / In Transit</option>{data.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
      <Field label="Available Door"><select value={form.doorId} onChange={(e) => setForm({ ...form, doorId: e.target.value })}><option value="">No door</option>{availableDoors.map((d) => <option key={d.id} value={d.id}>{data.warehouses.find((w) => w.id === d.warehouseId)?.name} - {d.code}</option>)}</select></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Trailer notes" /></Field>
    </div><div className="form-actions">{editingId ? <button className="btn btn-soft" onClick={cancelEdit}>Cancel</button> : null}<button className="btn btn-primary" onClick={save}>{editingId ? 'Update Trailer' : 'Create Trailer'}</button></div></div>
    <div className="card"><h2>Trailer Master</h2><div className="table-wrap"><table><thead><tr><th>Trailer</th><th>Company</th><th>Status</th><th>Location</th><th>Active Task</th><th>Actions</th></tr></thead><tbody>{filtered.map((t) => <tr key={t.id}><td><strong>{t.number}</strong><br /><small>{t.plate || '-'}</small></td><td>{data.companies.find((c) => c.id === t.companyId)?.name}</td><td><span className={`badge ${iconForStatus(t.status)}`}>{t.status}</span></td><td>{data.warehouses.find((w) => w.id === t.warehouseId)?.name || 'In Transit'} {t.doorId ? `• ${data.doors.find((d) => d.id === t.doorId)?.code}` : ''}</td><td>{t.activeTaskId || '-'}</td><td><div className="table-actions"><button className="btn btn-soft btn-small" onClick={() => startEdit(t)}>Edit</button><button className="btn btn-danger btn-small" onClick={() => remove(t)}>Delete</button></div></td></tr>)}</tbody></table></div></div>
  </div>;
}


function RequestForm({ user, store, type }) {
  const data = store.data;
  const [form, setForm] = useState({ type, po: '', reference: '', sourceWarehouseId: '', destinationWarehouseId: data.warehouses[0]?.id || '', pallets: '', trailerId: '', priority: 'Normal', appointment: '', notes: '' });
  const trailers = data.trailers.filter((t) => t.companyId === user.companyId && !t.activeTaskId && (type === 'pickup' ? t.doorId : t.status === 'Empty'));
  const submit = () => { try { store.createRequest({ ...form, type }, user); setForm({ type, po: '', reference: '', sourceWarehouseId: '', destinationWarehouseId: data.warehouses[0]?.id || '', pallets: '', trailerId: '', priority: 'Normal', appointment: '', notes: '' }); } catch (e) { alert(e.message); } };
  return <div className="card"><h2>{type === 'pickup' ? 'Book Intercompany Pickup' : 'Request Empty Trailer'}</h2><p className="card-sub">RNF submissions are automatically approved and create shunter tasks.</p><div className="notice green">Auto Approval: RNF is configured as a trusted intercompany requestor.</div>
    <div className="form-grid">
      {type === 'pickup' ? <><Field label="PO Number"><input value={form.po} onChange={(e) => setForm({ ...form, po: e.target.value })} placeholder="4500123456" /></Field><Field label="Reference / STO / OBD"><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" /></Field><Field label="Source Warehouse"><select value={form.sourceWarehouseId} onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}><option value="">Select source</option>{data.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field></> : null}
      <Field label="Destination Warehouse"><select value={form.destinationWarehouseId} onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}>{data.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
      <Field label="Number of Pallets"><input type="number" value={form.pallets} onChange={(e) => setForm({ ...form, pallets: e.target.value })} placeholder="25" /></Field>
      <Field label="Trailer Number"><select value={form.trailerId} onChange={(e) => setForm({ ...form, trailerId: e.target.value })}><option value="">{type === 'pickup' ? 'Optional / assign later' : 'Auto select empty trailer'}</option>{trailers.map((t) => <option key={t.id} value={t.id}>{t.number} • {t.status}</option>)}</select></Field>
      <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Normal</option><option>High</option><option>Urgent</option></select></Field>
      <Field label="Needed / Appointment Time"><input value={form.appointment} onChange={(e) => setForm({ ...form, appointment: e.target.value })} placeholder="Today 10:30 AM" /></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions" /></Field>
    </div><div className="form-actions"><button className="btn btn-green" onClick={submit}>Submit Request</button></div>
  </div>;
}

function RNFTrailerLocations({ user, store, search = '', compact = false }) {
  const data = store.data;
  const trailers = data.trailers.filter((t) => t.companyId === user.companyId && `${t.number} ${t.plate} ${t.status} ${data.warehouses.find((w) => w.id === t.warehouseId)?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="section-stack">
    {!compact ? <div className="card"><h2>RNF Live Yard View</h2><p className="card-sub">Only RNF trailers are visible to RNF users. Empty doors are shown for context.</p><YardMap data={data} companyId={user.companyId} /></div> : null}
    <div className={compact ? 'rnf-trailer-grid' : 'card'}>
      {!compact ? <h2>Trailer Location List</h2> : null}
      <div className="rnf-trailer-grid">
        {trailers.slice(0, compact ? 6 : 999).map((t) => <div className="trailer-card" key={t.id}><h3>{t.number}</h3><span className={`badge ${iconForStatus(t.status)}`}>{t.status}</span><div className="trailer-location"><strong>{data.warehouses.find((w) => w.id === t.warehouseId)?.name || 'In Transit'}</strong><br />{t.doorId ? `Door ${data.doors.find((d) => d.id === t.doorId)?.code}` : 'Moving / no door assigned'}<br />Last move: {timeOnly(t.lastMovedAt)}</div><div className="map-strip" /></div>)}
      </div>
    </div>
  </div>;
}

function RequestHistory({ user, store, compact = false }) {
  const data = store.data;
  const rows = data.requests.filter((r) => r.companyId === user.companyId).slice(0, compact ? 6 : 999);
  return <div className={compact ? '' : 'card'}>{!compact ? <><h2>My Requests</h2><p className="card-sub">Track pickup and empty trailer requests.</p></> : null}<RequestsDataTable data={data} rows={rows} /></div>;
}

function RequestsDataTable({ data, rows }) {
  return <div className="table-wrap"><table><thead><tr><th>Request</th><th>Type</th><th>Route</th><th>Pallets</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><strong>{r.id}</strong><br /><small>{r.po || r.reference || '-'}</small></td><td>{r.type}</td><td>{data.warehouses.find((w) => w.id === r.sourceWarehouseId)?.name || 'Yard'} → {data.warehouses.find((w) => w.id === r.destinationWarehouseId)?.name || '-'}</td><td>{r.pallets}</td><td><span className={`badge ${iconForStatus(r.status)}`}>{r.status}</span></td><td>{dateOnly(r.createdAt)}</td></tr>)}</tbody></table></div>;
}

function AdminRequests({ user, store }) {
  const data = store.data;
  const [assign, setAssign] = useState({});
  const pending = data.requests.filter((r) => r.status === 'Pending Approval');
  const shunters = data.users.filter((u) => u.role === 'shunter' && u.active);
  const trailers = data.trailers.filter((t) => !t.activeTaskId);
  return <div className="section-stack">
    <div className="card"><h2>Pending Admin Approval</h2>{pending.length ? <div className="task-list">{pending.map((r) => <div className="task-card" key={r.id}><div className="task-head"><div><h3>{r.id}</h3><p className="card-sub">{data.companies.find((c) => c.id === r.companyId)?.name} • {r.type}</p></div><span className="badge orange">Pending Approval</span></div><div className="form-grid"><Field label="Assign Shunter"><select value={assign[r.id]?.shunterId || ''} onChange={(e) => setAssign({ ...assign, [r.id]: { ...assign[r.id], shunterId: e.target.value } })}><option value="">Select shunter</option>{shunters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Trailer"><select value={assign[r.id]?.trailerId || r.trailerId || ''} onChange={(e) => setAssign({ ...assign, [r.id]: { ...assign[r.id], trailerId: e.target.value } })}><option value="">Assign later</option>{trailers.map((t) => <option key={t.id} value={t.id}>{t.number} • {t.status}</option>)}</select></Field></div><div className="form-actions"><button className="btn btn-primary" onClick={() => { try { store.approveAndAssign(r.id, assign[r.id]?.shunterId, assign[r.id]?.trailerId, user); } catch (e) { alert(e.message); } }}>Approve & Assign</button></div></div>)}</div> : <div className="empty-state">No pending requests. RNF requests are auto-approved.</div>}</div>
    <div className="card"><h2>All Requests</h2><RequestsDataTable data={data} rows={data.requests} /></div>
  </div>;
}

function ShunterTasks({ user, store, completedOnly = false, search = '' }) {
  const data = store.data;
  const [dropDoor, setDropDoor] = useState({});
  // Show all active tasks to shunter, so tasks are not hidden by Firebase UID vs demo ID.
  const tasks = data.tasks.filter((t) =>
    (completedOnly ? t.status === 'Completed' : t.status !== 'Completed') &&
    `${t.id} ${t.po || ''} ${data.trailers.find((x) => x.id === t.trailerId)?.number || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  if (!tasks.length) return <div className="empty-state">No {completedOnly ? 'completed' : 'active'} tasks found.<br />Create a request from RNF or assign a request from Admin.</div>;
  return <div className="task-list">{tasks.map((task) => {
    const trailer = data.trailers.find((t) => t.id === task.trailerId);
    const availableDoors = data.doors.filter((d) => !d.trailerId && d.warehouseId === task.destinationWarehouseId && d.status !== 'Maintenance');
    return <div className="task-card" key={task.id}>
      <div className="task-head"><div><h2>{task.id}</h2><p className="card-sub">{task.type === 'empty' ? 'Empty Trailer Request' : 'Pickup Task'} • {task.po || 'No PO'} • {task.pallets} pallets</p></div><span className={`badge ${iconForStatus(task.status)}`}>{task.status}</span></div>
      <div className="task-route"><div className="route-box"><strong>Source</strong><br />{data.warehouses.find((w) => w.id === task.sourceWarehouseId)?.name || 'Yard / Available Empty'}<br />{task.sourceDoorId ? `Door ${data.doors.find((d) => d.id === task.sourceDoorId)?.code}` : ''}</div><div className="route-arrow">→</div><div className="route-box"><strong>Destination</strong><br />{data.warehouses.find((w) => w.id === task.destinationWarehouseId)?.name}<br />{task.destinationDoorId ? `Door ${data.doors.find((d) => d.id === task.destinationDoorId)?.code}` : 'Select door before drop'}</div><div className="route-box"><strong>Trailer</strong><br />{trailer?.number || 'Trailer TBD'}<br />{trailer?.status || ''}</div></div>
      <Progress current={task.status} />
      {task.status === 'Picked Up' ? <div className="notice yellow"><strong>Select an empty destination door before dropping.</strong><br />This prevents more than one trailer from being assigned to the same door.</div> : null}
      {task.status === 'Picked Up' ? <Field label="Available Destination Door"><select value={dropDoor[task.id] || ''} onChange={(e) => setDropDoor({ ...dropDoor, [task.id]: e.target.value })}><option value="">Select empty door</option>{availableDoors.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}</select></Field> : null}
      <div className="shunter-actions">
        {taskButtons.map((status) => <button key={status} className={`btn ${status === 'Completed' ? 'btn-green' : status === 'Dropped' ? 'btn-warning' : 'btn-primary'}`} disabled={!canMove(task.status, status)} onClick={() => { try { store.updateTaskStatus(task.id, status, dropDoor[task.id], user); } catch (e) { alert(e.message); } }}>{status}</button>)}
      </div>
      <Timeline task={task} />
    </div>;
  })}</div>;
}

function canMove(current, next) {
  const order = ['Assigned', 'Started', 'Arrived', 'Picked Up', 'Dropped', 'Completed'];
  return order.indexOf(next) === order.indexOf(current) + 1;
}

function Progress({ current }) {
  const steps = ['Started', 'Arrived', 'Picked Up', 'Dropped', 'Completed'];
  const currentIndex = steps.indexOf(current);
  return <div className="progress-steps">{steps.map((s, i) => <div key={s} className={`step ${i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''}`}>{s}</div>)}</div>;
}

function Timeline({ task }) {
  const entries = Object.entries(task.timestamps || {});
  return <div className="timeline" style={{ marginTop: 16 }}>{entries.map(([status, iso]) => <div className="timeline-item" key={status}><div className="timeline-dot" /><div className="timeline-content"><strong>{status}</strong><span>{dateOnly(iso)} • {timeOnly(iso)}</span></div></div>)}</div>;
}

function AdminTasks({ user, store, search }) {
  return <div className="card"><h2>All Shunter Tasks</h2><ShunterTaskTable data={store.data} search={search} /></div>;
}
function ShunterTaskTable({ data, search }) {
  const rows = data.tasks.filter((t) => `${t.id} ${t.po} ${data.trailers.find((x) => x.id === t.trailerId)?.number || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="table-wrap"><table><thead><tr><th>Task</th><th>Trailer</th><th>Route</th><th>Assigned To</th><th>Status</th></tr></thead><tbody>{rows.map((t) => <tr key={t.id}><td><strong>{t.id}</strong><br /><small>{t.po || '-'}</small></td><td>{data.trailers.find((x) => x.id === t.trailerId)?.number || 'TBD'}</td><td>{data.warehouses.find((w) => w.id === t.sourceWarehouseId)?.name || 'Yard'} → {data.warehouses.find((w) => w.id === t.destinationWarehouseId)?.name || '-'}</td><td>{assigneeName(data, t.assignedTo)}</td><td><span className={`badge ${iconForStatus(t.status)}`}>{t.status}</span></td></tr>)}</tbody></table></div>;
}

function UsersInvites({ user, store }) {
  const data = store.data;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('rnf');
  const [companyId, setCompanyId] = useState('rnf');
  const invite = () => { if (!email) return alert('Enter email.'); store.createInvite(email, role, companyId, user); setEmail(''); };
  return <div className="grid-2">
    <div className="card"><h2>Invite User</h2><p className="card-sub">Send invitation links tied to the email and company.</p><div className="form-grid one"><Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@rnf.com" /></Field><Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value)}><option value="rnf">RNF User</option><option value="admin">Admin</option><option value="shunter">Shunter</option></select></Field><Field label="Company"><select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div><div className="form-actions"><button className="btn btn-primary" onClick={invite}>Create Invite</button></div></div>
    <div className="card"><h2>Users & Invitations</h2><div className="table-wrap"><table><thead><tr><th>User / Invite</th><th>Role</th><th>Company</th><th>Status / Link</th></tr></thead><tbody>{data.users.map((u) => <tr key={u.id}><td><strong>{u.name}</strong><br /><small>{u.email}</small></td><td>{roleLabel(u.role)}</td><td>{data.companies.find((c) => c.id === u.companyId)?.name}</td><td><span className="badge green">Active</span></td></tr>)}{data.invitations.map((i) => <tr key={i.id}><td><strong>{i.email}</strong></td><td>{roleLabel(i.role)}</td><td>{data.companies.find((c) => c.id === i.companyId)?.name}</td><td><code>/invite/{i.token}</code></td></tr>)}</tbody></table></div></div>
  </div>;
}

function Reports({ store }) {
  const data = store.data;
  const exportCSV = (name, rows) => {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const requestRows = [['Request', 'Type', 'PO', 'Company', 'Status', 'Pallets', 'Created'], ...data.requests.map((r) => [r.id, r.type, r.po, data.companies.find((c) => c.id === r.companyId)?.name, r.status, r.pallets, r.createdAt])];
  const trailerRows = [['Trailer', 'Company', 'Status', 'Warehouse', 'Door', 'Last Moved'], ...data.trailers.map((t) => [t.number, data.companies.find((c) => c.id === t.companyId)?.name, t.status, data.warehouses.find((w) => w.id === t.warehouseId)?.name || 'In Transit', data.doors.find((d) => d.id === t.doorId)?.code || '', t.lastMovedAt])];
  return <div className="section-stack">
    <div className="card"><h2>Reports</h2><p className="card-sub">Download Excel-ready CSV reports or use Print / Save as PDF from your browser.</p><div className="report-grid"><ReportCard title="Daily Requests" text="Pickup and empty trailer request summary." onCSV={() => exportCSV('daily-requests', requestRows)} /><ReportCard title="Trailer Locations" text="Current trailer location and status." onCSV={() => exportCSV('trailer-locations', trailerRows)} /><ReportCard title="Task Report" text="Shunter task status report." onCSV={() => exportCSV('shunter-tasks', [['Task', 'PO', 'Status'], ...data.tasks.map((t) => [t.id, t.po, t.status])])} /><ReportCard title="PDF Report" text="Print the current report page as PDF." onCSV={() => window.print()} label="Print PDF" /></div></div>
    <div className="card"><h2>Preview: Request Report</h2><RequestsTable data={data} /></div>
  </div>;
}
function ReportCard({ title, text, onCSV, label = 'Excel CSV' }) { return <div className="report-card"><strong>{title}</strong><p className="card-sub">{text}</p><button className="btn btn-primary btn-small" onClick={onCSV}>{label}</button></div>; }

function Field({ label, children }) { return <div className="field"><label>{label}</label>{children}</div>; }
