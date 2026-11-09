// =========================================================================================
// costes.js — PRECIOS DE COSTE de los platos (solo para el editor; la web nunca los ve).
// Común a todos los editores (lo copia e inserta construir.ps1, después de subir-foto.js).
//   Se guardan CIFRADOS en GitHub, junto a datos.json: <web>/costes.json
//     { "cifrado": "AES-GCM", "kdf": "PBKDF2-SHA256", "iter": 200000, "salt", "iv", "datos" }  (base64)
//     dentro: { "costes": { "<id>": 2.35, … }, "actualizado": "<fecha>" }
//   El repo es PÚBLICO: sin la contraseña de costes no se puede leer. La contraseña se pide una vez
//   (se recuerda en la sesión, o en este navegador si se marca). Si se olvida, los costes no se recuperan.
//   Ventana "💰 Precios de coste": tabla por categoría (PVP, coste, % coste), importar de una lista
//   (pegar de Excel: ID o nombre + coste) y "% aproximado" (coste = PVP × %) para los que no tengan.
//   Lo usa menu-precios.js (Menú Especial). publicar.ps1 no pisa costes.json.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.costes = '1.0.0'; // 9 nov: precios de coste de los platos, cifrados con contraseña en costes.json; ventana 💰 con importar de lista y % aproximado

    var ARCH = 'costes.json', ITER = 200000;
    var CLAVE_PASS = 'costes-clave-' + (S.restaurante || S.modo || '');
    var mapa = null, pass = null, archivo, cargando = null, oyentes = [];
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    var num = function (v) { if (v == null) return NaN; var t = String(v).replace(/[€\s]/g, ''); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, ''); return t === '' ? NaN : parseFloat(t); };
    var eur = function (v) { return isFinite(v) ? v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'; };

    // ---------- cifrado ----------
    var b64 = function (buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
    var deB64 = function (t) { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
    async function llave(p, salt, iter) {
        var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    async function cifrar(obj, p) {
        var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
        var d = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await llave(p, salt, ITER), new TextEncoder().encode(JSON.stringify(obj)));
        return { nota: 'Precios de coste del editor, cifrados (sin la contraseña de costes no se pueden leer).', cifrado: 'AES-GCM', kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), datos: b64(d) };
    }
    async function descifrar(a, p) {
        var d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(a.iv) }, await llave(p, deB64(a.salt), a.iter || ITER), deB64(a.datos));
        return JSON.parse(new TextDecoder().decode(d));
    }

    // ---------- leer / guardar ----------
    function passGuardada() { try { return sessionStorage.getItem(CLAVE_PASS) || localStorage.getItem(CLAVE_PASS) || ''; } catch (e) { return ''; } }
    function recordarPass(p, siempre) {
        try { sessionStorage.setItem(CLAVE_PASS, p); if (siempre) localStorage.setItem(CLAVE_PASS, p); else localStorage.removeItem(CLAVE_PASS); } catch (e) { }
    }
    function olvidarPass() { try { sessionStorage.removeItem(CLAVE_PASS); localStorage.removeItem(CLAVE_PASS); } catch (e) { } pass = null; mapa = null; avisarCambio(); }
    async function leerArchivo() {
        if (archivo !== undefined) return archivo;
        if (!window.SubirFoto || !window.SubirFoto.leerTexto) throw new Error('Falta subir-foto.js 1.23.1 o posterior.');
        var t = await window.SubirFoto.leerTexto(ARCH);
        archivo = t ? JSON.parse(t) : null;
        return archivo;
    }
    // Intenta abrir sin preguntar (contraseña recordada). Devuelve el mapa o null (bloqueado / no hay).
    function cargarSilencioso() {
        if (mapa) return Promise.resolve(mapa);
        if (cargando) return cargando;
        cargando = (async function () {
            try {
                var a = await leerArchivo(), p = passGuardada();
                if (!a || !p) return null;
                var o = await descifrar(a, p);
                pass = p; mapa = o.costes || {}; avisarCambio();
                return mapa;
            } catch (e) { return null; } finally { cargando = null; }
        })();
        return cargando;
    }
    // Abre (pide la contraseña si hace falta; si no hay costes.json, la crea). Devuelve el mapa o null (cancelado).
    async function desbloquear() {
        if (mapa) return mapa;
        if (await cargarSilencioso()) return mapa;
        var a = await leerArchivo();
        while (true) {
            var r = await pedirPass(!a);
            if (!r) return null;
            if (!a) { pass = r.p; mapa = {}; recordarPass(r.p, r.siempre); avisarCambio(); return mapa; }
            try { var o = await descifrar(a, r.p); pass = r.p; mapa = o.costes || {}; recordarPass(r.p, r.siempre); avisarCambio(); return mapa; }
            catch (e) { r.error = true; window.alert('Contraseña de costes incorrecta.'); }
        }
    }
    async function guardar(nuevo) {
        if (!pass) throw new Error('Costes bloqueados.');
        var limpio = {};
        Object.keys(nuevo).forEach(function (k) { var v = +nuevo[k]; if (isFinite(v) && v > 0) limpio[k] = Math.round(v * 100) / 100; });
        var a = await cifrar({ costes: limpio, actualizado: new Date().toISOString() }, pass);
        await window.SubirFoto.guardarTexto(ARCH, JSON.stringify(a, null, 1), 'Precios de coste (' + Object.keys(limpio).length + ' platos, cifrados)');
        archivo = a; mapa = limpio; avisarCambio();
    }
    function avisarCambio() { oyentes.forEach(function (f) { try { f(mapa); } catch (e) { } }); }

    function pedirPass(nueva) {
        return new Promise(function (ok) {
            var f = document.createElement('div');
            f.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
            f.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px;width:min(440px,100%);box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
                '<h3 style="margin:0 0 6px">🔒 ' + (nueva ? 'Crear la contraseña de costes' : 'Contraseña de costes') + '</h3>' +
                '<p style="font-size:.85rem;color:#555;margin:0 0 12px">' + (nueva
                    ? 'Los precios de coste se guardan CIFRADOS en GitHub (el repo es público). Elige una contraseña y apúntala: si se olvida, los costes no se pueden recuperar. Es la misma para todos los que editen esta web.'
                    : 'Los precios de coste están cifrados. Escribe la contraseña de costes de esta web.') + '</p>' +
                '<input type="password" id="cs-p1" placeholder="Contraseña" style="width:100%;box-sizing:border-box;padding:9px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px">' +
                (nueva ? '<input type="password" id="cs-p2" placeholder="Repite la contraseña" style="width:100%;box-sizing:border-box;padding:9px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px">' : '') +
                '<label style="font-size:.82rem;color:#555"><input type="checkbox" id="cs-rec"> Recordarla en este navegador</label>' +
                '<div style="text-align:right;margin-top:14px"><button id="cs-no" style="padding:8px 14px;margin-right:6px">Cancelar</button><button id="cs-si" style="padding:8px 14px;background:#e67e22;color:#fff;border:none;border-radius:6px;font-weight:600">' + (nueva ? 'Crear' : 'Abrir') + '</button></div></div>';
            document.body.appendChild(f);
            var p1 = f.querySelector('#cs-p1'), p2 = f.querySelector('#cs-p2');
            p1.focus();
            var fin = function (v) { f.remove(); ok(v); };
            var si = function () {
                if (p1.value.length < 4) { window.alert('Mínimo 4 caracteres.'); return; }
                if (p2 && p1.value !== p2.value) { window.alert('Las dos contraseñas no coinciden.'); return; }
                fin({ p: p1.value, siempre: f.querySelector('#cs-rec').checked });
            };
            f.querySelector('#cs-si').onclick = si;
            f.querySelector('#cs-no').onclick = function () { fin(null); };
            f.addEventListener('keydown', function (e) { if (e.key === 'Enter') si(); if (e.key === 'Escape') fin(null); });
        });
    }

    // ---------- platos de la carta ----------
    function platos() {
        var l = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        return l.filter(function (p) { return p && +p.id >= 1000 && String(p.es || '').trim(); }).sort(function (a, b) { return a.id - b.id; });
    }
    function nombre(p) { var t = String(p.es || ''); try { if (typeof window.desglosarNombre === 'function') t = window.desglosarNombre(t).nombre || t; } catch (e) { } return t.split(/\n|\|/)[0].replace(/\/\/.*$/, '').trim(); }
    function categoria(id) {
        try { var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id); return (c && typeof c.nombre === 'string') ? c.nombre : ''; } catch (e) { return ''; }
    }
    function pvp(p) { return num(p && p.precio); }

    // Lista pegada (Excel, CSV…): por línea, ID o nombre + coste (el último número de la línea).
    function interpretar(texto) {
        var ps = platos(), porId = {}, porNom = {};
        ps.forEach(function (p) { porId[String(p.id)] = p; var n = norm(nombre(p)); (porNom[n] = porNom[n] || []).push(p); });
        var ok = [], mal = [];
        String(texto || '').split(/\r?\n/).forEach(function (l) {
            if (!l.trim()) return;
            var t = l.split(/\t|;/).map(function (x) { return x.trim(); }).filter(Boolean);
            if (t.length < 2) { var m = l.trim().match(/^(.*\S)\s+([\d.,]+\s*€?)$/); t = m ? [m[1], m[2]] : [l.trim()]; }
            var c = NaN, ic = -1;
            for (var i = t.length - 1; i > 0; i--) { var v = num(t[i]); if (isFinite(v)) { c = v; ic = i; break; } }
            if (!isFinite(c)) { mal.push(l.trim() + '  (sin coste)'); return; }
            var cab = t.slice(0, ic), p = null;
            if (/^\d{3,6}$/.test(cab[0]) && porId[cab[0]]) p = porId[cab[0]];
            if (!p) {
                var n = norm(cab.filter(function (x) { return !/^\d{3,6}$/.test(x); }).join(' '));
                if (porNom[n] && porNom[n].length === 1) p = porNom[n][0];
                else if (n.length >= 4) {
                    var cand = ps.filter(function (q) { var nq = norm(nombre(q)); return nq.indexOf(n) >= 0 || n.indexOf(nq) >= 0; });
                    if (cand.length === 1) p = cand[0];
                }
            }
            if (p) ok.push({ p: p, c: c, l: l.trim() }); else mal.push(l.trim() + '  (no encuentro el plato)');
        });
        return { ok: ok, mal: mal };
    }

    // ---------- ventana 💰 ----------
    async function abrir() {
        if (!(await desbloquear())) return;
        if (document.getElementById('cs-fondo')) return;
        var edit = Object.assign({}, mapa), sucio = false, filtro = '', cat = '';
        var f = document.createElement('div');
        f.id = 'cs-fondo';
        f.innerHTML = '<style>' +
            '#cs-fondo{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:12px}' +
            '#cs-caja{background:#fff;border-radius:12px;width:min(1100px,100%);height:min(92vh,1000px);display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3);font-size:.88rem}' +
            '#cs-cab{padding:14px 18px;border-bottom:1px solid #e5e7eb}#cs-cab h3{margin:0 0 6px;font-size:1.15rem}' +
            '.cs-fila{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.cs-fila input,.cs-fila select{padding:6px 8px;border:1px solid #ccc;border-radius:6px}' +
            '#cs-cuerpo{flex:1;overflow:auto;padding:0 18px 12px}table.cs{width:100%;border-collapse:collapse}table.cs th{position:sticky;top:0;background:#fff;text-align:left;padding:8px 6px;border-bottom:2px solid #e5e7eb;font-size:.78rem;color:#64748b}' +
            'table.cs td{padding:4px 6px;border-bottom:1px solid #f1f5f9}table.cs td.n{text-align:right;white-space:nowrap}table.cs input{width:80px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;text-align:right}' +
            'tr.cs-cat td{background:#fff7ed;font-weight:700;color:#9a3412;padding-top:10px}.cs-pc.alto{color:#b42318;font-weight:600}.cs-pc.ok{color:#15803d}' +
            '#cs-pie{padding:10px 18px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:center}#cs-pie button,#cs-cab button{padding:7px 14px;border-radius:7px;border:1px solid #ddd;background:#f8f9fa;cursor:pointer}' +
            '#cs-pie .si{background:#e67e22;color:#fff;border-color:#e67e22;font-weight:600}#cs-imp textarea{width:100%;height:110px;box-sizing:border-box;font-family:monospace;font-size:.8rem}' +
            '</style><div id="cs-caja"><div id="cs-cab"><h3>💰 Precios de coste <small style="font-weight:400;color:#64748b">· cifrados, solo el editor los ve</small></h3>' +
            '<div class="cs-fila"><input type="text" id="cs-q" placeholder="Buscar plato o ID…" style="width:200px"><select id="cs-cat"></select>' +
            '<label><input type="checkbox" id="cs-sin"> solo sin coste</label>' +
            '<span style="margin-left:auto">Aproximado: coste = PVP × <input type="number" id="cs-pct" value="30" min="1" max="100" style="width:60px"> % ' +
            '<button id="cs-apl">a los que no tienen coste (de lo que se ve)</button></span></div>' +
            '<details id="cs-imp" style="margin-top:8px"><summary style="cursor:pointer">📋 Importar de una lista</summary>' +
            '<p style="color:#64748b;margin:6px 0">Pega aquí (de Excel, una tabla, un correo…) una línea por plato: <b>ID</b> o <b>nombre</b> y el <b>coste</b> (el último número de la línea). Ej.: <code>8001;2,35</code> · <code>Tarta de queso	1,80</code></p>' +
            '<textarea id="cs-txt" placeholder="8001;2,35&#10;Croquetas de jamón;3,10"></textarea><div class="cs-fila"><button id="cs-ver">Comprobar</button><span id="cs-res"></span></div></details></div>' +
            '<div id="cs-cuerpo"></div><div id="cs-pie"><span id="cs-est" style="color:#64748b"></span><button id="cs-olv" style="margin-left:auto" title="Olvidar la contraseña en este navegador (se volverá a pedir)">🔒 Bloquear</button><button id="cs-cerrar">Cerrar</button><button id="cs-guardar" class="si">💾 Guardar costes</button></div></div>';
        document.body.appendChild(f);
        var $ = function (s) { return f.querySelector(s); };
        var cats = []; platos().forEach(function (p) { var c = categoria(p.id) || 'Sin categoría'; if (cats.indexOf(c) < 0) cats.push(c); });
        $('#cs-cat').innerHTML = '<option value="">Todas las categorías</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
        var visibles = function () {
            var w = norm(filtro).split(' ').filter(Boolean), solo = $('#cs-sin').checked;
            return platos().filter(function (p) {
                if (cat && (categoria(p.id) || 'Sin categoría') !== cat) return false;
                if (solo && edit[p.id] > 0) return false;
                var t = norm(p.id + ' ' + nombre(p));
                return w.every(function (x) { return t.indexOf(x) >= 0; });
            });
        };
        var pc = function (p) { var v = pvp(p), c = +edit[p.id]; return v > 0 && c > 0 ? c / v * 100 : NaN; };
        var celdaPc = function (p) { var x = pc(p); return isFinite(x) ? '<span class="cs-pc ' + (x > 35 ? 'alto' : 'ok') + '">' + x.toFixed(0) + ' %</span>' : ''; };
        var estado = function () {
            var con = platos().filter(function (p) { return edit[p.id] > 0; }).length;
            $('#cs-est').textContent = con + ' de ' + platos().length + ' platos con coste' + (sucio ? ' · ⚠ cambios sin guardar' : '');
        };
        var pintar = function () {
            var ult = '', html = '<table class="cs"><tr><th>ID</th><th>Plato</th><th style="text-align:right">PVP carta</th><th style="text-align:right">Coste</th><th style="text-align:right">% coste</th></tr>';
            visibles().forEach(function (p) {
                var c = categoria(p.id) || 'Sin categoría';
                if (c !== ult) { html += '<tr class="cs-cat"><td colspan="5">' + esc(c) + '</td></tr>'; ult = c; }
                html += '<tr data-id="' + p.id + '"><td>' + p.id + '</td><td>' + esc(nombre(p)) + (p.activa ? '' : ' <small style="color:#94a3b8">(inactivo)</small>') + '</td><td class="n">' + eur(pvp(p)) + '</td>' +
                    '<td class="n"><input type="text" inputmode="decimal" value="' + (edit[p.id] > 0 ? String(edit[p.id]).replace('.', ',') : '') + '"> €</td><td class="n">' + celdaPc(p) + '</td></tr>';
            });
            $('#cs-cuerpo').innerHTML = html + '</table>';
            $('#cs-cuerpo').querySelectorAll('tr[data-id] input').forEach(function (i) {
                i.onchange = function () {
                    var id = i.closest('tr').dataset.id, v = num(i.value);
                    if (isFinite(v) && v > 0) edit[id] = Math.round(v * 100) / 100; else delete edit[id];
                    sucio = true; i.closest('tr').lastChild.innerHTML = celdaPc({ id: id, precio: (platos().find(function (q) { return String(q.id) === id; }) || {}).precio });
                    estado();
                };
            });
            estado();
        };
        $('#cs-q').oninput = function () { filtro = this.value; pintar(); };
        $('#cs-cat').onchange = function () { cat = this.value; pintar(); };
        $('#cs-sin').onchange = pintar;
        $('#cs-apl').onclick = function () {
            var pct = num($('#cs-pct').value), n = 0;
            if (!(pct > 0)) return;
            visibles().forEach(function (p) { if (!(edit[p.id] > 0) && pvp(p) > 0) { edit[p.id] = Math.round(pvp(p) * pct) / 100; n++; } });
            if (n) sucio = true;
            pintar(); $('#cs-est').textContent += ' · ' + n + ' puestos al ' + pct + ' % (revísalos)';
        };
        var pendienteImp = null;
        $('#cs-ver').onclick = function () {
            var r = interpretar($('#cs-txt').value); pendienteImp = r.ok;
            $('#cs-res').innerHTML = '<b>' + r.ok.length + '</b> reconocidos' + (r.ok.length ? ' <button id="cs-imp-si" class="si" style="background:#e67e22;color:#fff;border:none;border-radius:6px;padding:6px 12px">Aplicar ' + r.ok.length + '</button>' : '') +
                (r.mal.length ? '<br><span style="color:#b42318">' + r.mal.length + ' sin reconocer: ' + esc(r.mal.slice(0, 8).join(' · ')) + (r.mal.length > 8 ? '…' : '') + '</span>' : '') +
                (r.ok.length ? '<br><small style="color:#64748b">' + esc(r.ok.slice(0, 10).map(function (o) { return o.p.id + ' ' + nombre(o.p) + ' = ' + eur(o.c); }).join(' · ')) + (r.ok.length > 10 ? '…' : '') + '</small>' : '');
            var b = $('#cs-imp-si');
            if (b) b.onclick = function () { pendienteImp.forEach(function (o) { edit[o.p.id] = Math.round(o.c * 100) / 100; }); sucio = true; $('#cs-res').textContent = '✔ ' + pendienteImp.length + ' costes puestos (falta Guardar).'; pintar(); };
        };
        var cerrar = function () {
            if (sucio && !window.confirm('Hay costes sin guardar. ¿Cerrar sin guardar?')) return;
            f.remove();
        };
        $('#cs-cerrar').onclick = cerrar;
        $('#cs-olv').onclick = function () { if (sucio && !window.confirm('Hay costes sin guardar. ¿Bloquear igualmente?')) return; f.remove(); olvidarPass(); };
        $('#cs-guardar').onclick = async function () {
            var b = this; b.disabled = true; b.textContent = '⏳ Guardando…';
            try { await guardar(edit); sucio = false; estado(); b.textContent = '✔ Guardado'; setTimeout(function () { b.textContent = '💾 Guardar costes'; b.disabled = false; }, 1500); }
            catch (e) { window.alert('No se pudieron guardar los costes: ' + (e.message || e)); b.textContent = '💾 Guardar costes'; b.disabled = false; }
        };
        f.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
        pintar();
    }

    window.Costes = {
        cargarSilencioso: cargarSilencioso,
        desbloquear: desbloquear,
        abierto: function () { return !!mapa; },
        get: function (id) { return mapa && mapa[String(id)] > 0 ? mapa[String(id)] : NaN; },
        abrir: abrir,
        bloquear: olvidarPass,
        alCambiar: function (fn) { oyentes.push(fn); },
        interpretar: interpretar,   // (para pruebas)
        num: num
    };
})();
