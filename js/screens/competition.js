// ============================================
// GravityFit — Social Competition Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast } from '../components.js';
import { App } from '../app.js';

export const CompetitionScreen = {
  _activeTab: 'leaderboard', // 'leaderboard' | 'daily' | 'members' | 'friends'
  _selectedCompId: null,
  _leaderboardRange: 7, // days

  render() {
    const container = document.getElementById('screen-competition');
    if (!container) return;
    const comps = Storage.getCompetitions();
    const user = Storage.getUser();

    if (!comps.length) {
      container.innerHTML = `
        <div class="screen-header">
          <h1 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold)">Competencia</h1>
        </div>
        <div class="screen-content">
          <div class="empty-state" style="min-height:60vh">
            <div style="font-size:4rem;margin-bottom:16px">🏆</div>
            <div class="empty-state-title">¡Desafía a tus amigos!</div>
            <div class="empty-state-text" style="max-width:280px;margin:0 auto 20px">
              Compite con amigos en volumen, frecuencia y rachas. Crea una competencia o únete con un código.
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;max-width:260px;margin:0 auto">
              <button class="btn btn-primary btn-lg" onclick="CompetitionScreen.showCreateModal()">
                🏅 Crear Competencia
              </button>
              <button class="btn btn-outline btn-lg" onclick="CompetitionScreen.showJoinModal()">
                🔗 Unirse con Código
              </button>
            </div>
          </div>
        </div>`;
      return;
    }

    // If no comp selected, select the first one
    if (!this._selectedCompId || !comps.find(c => c.id === this._selectedCompId)) {
      this._selectedCompId = comps[0].id;
    }

    const comp = Storage.getCompetition(this._selectedCompId);
    const leaderboard = Storage.getCompetitionLeaderboard(this._selectedCompId, this._leaderboardRange);
    const myRank = leaderboard.findIndex(l => l.userId === user.cloudId) + 1;

    container.innerHTML = `
      <div class="screen-header">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div>
            <h1 style="font-size:var(--font-size-xl);font-weight:var(--font-weight-bold)">${comp.name}</h1>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">${comp.members?.length || 0} miembros${myRank > 0 ? ` · Tu posición: #${myRank}` : ''}</div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="CompetitionScreen.showSettingsModal()" title="Opciones">⚙️</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px">
          ${comps.length > 1 ? comps.map(c => `
            <button class="chip ${c.id === this._selectedCompId ? 'active' : ''}" onclick="CompetitionScreen.selectComp('${c.id}')">${c.name}</button>
          `).join('') : ''}
          <button class="chip" onclick="CompetitionScreen.showCreateModal()">+ Nueva</button>
        </div>
      </div>
      <div class="screen-content">
        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button class="chip ${this._activeTab === 'leaderboard' ? 'active' : ''}" onclick="CompetitionScreen.switchTab('leaderboard')">🏆 Leaderboard</button>
          <button class="chip ${this._activeTab === 'daily' ? 'active' : ''}" onclick="CompetitionScreen.switchTab('daily')">📅 Hoy</button>
          <button class="chip ${this._activeTab === 'friends' ? 'active' : ''}" onclick="CompetitionScreen.switchTab('friends')">🤝 Amigos</button>
          <button class="chip ${this._activeTab === 'members' ? 'active' : ''}" onclick="CompetitionScreen.switchTab('members')">👥 Miembros</button>
        </div>
        
        ${this._activeTab === 'leaderboard' ? this.renderLeaderboard(comp, leaderboard) :
          this._activeTab === 'daily' ? this.renderDailyView(comp) :
          this._activeTab === 'friends' ? this.renderFriends() :
          this.renderMembers(comp)}
      </div>`;
  },

  renderLeaderboard(comp, leaderboard) {
    const user = Storage.getUser();
    const rangeOptions = [
      { days: 7, label: '7 días' },
      { days: 14, label: '14 días' },
      { days: 30, label: '30 días' },
    ];

    if (!leaderboard.length) {
      return `
        <div style="text-align:center;padding:24px;color:var(--color-text-secondary)">
          <div style="font-size:3rem;margin-bottom:12px">📊</div>
          <p style="font-size:0.9rem;margin-bottom:8px">Sin datos de competencia aún</p>
          <p style="font-size:0.75rem;color:var(--color-text-tertiary)">Los datos aparecen después de completar entrenamientos</p>
        </div>`;
    }

    // Top 3 podium
    const podium = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    const podiumEmojis = ['🥇', '🥈', '🥉'];
    const podiumHeights = ['100px', '80px', '65px'];
    const podiumOrder = [1, 0, 2]; // Silver, Gold, Bronze layout

    let html = `
      <!-- Range selector -->
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:16px">
        ${rangeOptions.map(r => `
          <button class="chip ${this._leaderboardRange === r.days ? 'active' : ''}" 
            onclick="CompetitionScreen.setRange(${r.days})" style="font-size:0.7rem;padding:4px 12px">${r.label}</button>
        `).join('')}
      </div>`;

    // Podium
    if (podium.length >= 2) {
      html += `
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:24px;padding:0 16px">
          ${podiumOrder.filter(i => i < podium.length).map(idx => {
            const p = podium[idx];
            const isMe = p.userId === user.cloudId;
            return `
              <div style="flex:1;text-align:center;max-width:100px">
                <div style="font-size:2rem;margin-bottom:4px">${podiumEmojis[idx]}</div>
                <div style="width:48px;height:48px;border-radius:50%;background:${isMe ? 'var(--color-accent)' : 'var(--color-bg-card)'};border:2px solid ${isMe ? 'var(--color-accent)' : 'var(--color-border)'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:0.9rem;font-weight:bold;color:${isMe ? '#000' : 'var(--color-text)'}">
                  ${(p.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style="font-size:0.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isMe ? 'color:var(--color-accent)' : ''}">${isMe ? 'Tú' : (p.name || '???')}</div>
                <div style="font-size:0.7rem;color:var(--color-text-secondary)">${this._formatVol(p.totalVolume)} · ${p.totalWorkouts}d</div>
                <div style="height:${podiumHeights[idx]};background:linear-gradient(180deg, ${idx === 0 ? 'rgba(255,215,0,0.15)' : idx === 1 ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.1)'} 0%, transparent 100%);border-radius:8px 8px 0 0;margin-top:8px;border:1px solid ${idx === 0 ? 'rgba(255,215,0,0.3)' : idx === 1 ? 'rgba(192,192,192,0.2)' : 'rgba(205,127,50,0.2)'}"></div>
              </div>`;
          }).join('')}
        </div>`;
    }

    // Full ranking list
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:8px;color:var(--color-text-secondary)">Ranking por Volumen</div>`;
    leaderboard.forEach((entry, i) => {
      const isMe = entry.userId === user.cloudId;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      html += `
        <div class="comp-rank-card ${isMe ? 'me' : ''}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-bg-card);border:1px solid ${isMe ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:12px;margin-bottom:8px;${isMe ? 'box-shadow:0 0 12px rgba(163,255,18,0.1)' : ''}">
          <div style="width:28px;text-align:center;font-size:${i < 3 ? '1.1rem' : '0.8rem'};font-weight:700;color:${i < 3 ? 'inherit' : 'var(--color-text-secondary)'}">${medal}</div>
          <div style="width:36px;height:36px;border-radius:50%;background:${isMe ? 'var(--color-accent)' : 'var(--color-bg-input)'};display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;color:${isMe ? '#000' : 'var(--color-text)'};flex-shrink:0">
            ${(entry.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.85rem;font-weight:600;${isMe ? 'color:var(--color-accent)' : ''}">${isMe ? 'Tú' : (entry.name || 'Desconocido')}</div>
            <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${entry.days} días activos</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:0.9rem;font-weight:700;color:var(--color-accent)">${this._formatVol(entry.totalVolume)}</div>
            <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${entry.totalWorkouts} entrenos</div>
          </div>
        </div>`;
    });

    return html;
  },

  renderDailyView(comp) {
    const user = Storage.getUser();
    const today = Storage._localDateStr(new Date());
    const todayDetail = Storage.getCompetitionDailyDetail(comp.id, today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestDetail = Storage.getCompetitionDailyDetail(comp.id, Storage._localDateStr(yesterday));

    let html = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:2.5rem;margin-bottom:4px">📅</div>
        <div style="font-size:1rem;font-weight:700">Día de Competencia</div>
        <div style="font-size:0.75rem;color:var(--color-text-secondary)">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>`;

    // My today stats
    const myToday = todayDetail.find(d => d.userId === user.cloudId);
    html += `
      <div style="background:var(--color-bg-card);border:1px solid var(--color-accent);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:0.7rem;color:var(--color-text-tertiary);margin-bottom:8px">TU DÍA DE HOY</div>
        ${myToday ? `
          <div style="display:flex;justify-content:center;gap:16px">
            <div><div style="font-size:1.3rem;font-weight:700;color:var(--color-accent)">${myToday.workouts || 0}</div><div style="font-size:0.65rem;color:var(--color-text-secondary)">Entrenos</div></div>
            <div><div style="font-size:1.3rem;font-weight:700;color:var(--color-accent)">${this._formatVol(myToday.volume || 0)}</div><div style="font-size:0.65rem;color:var(--color-text-secondary)">Volumen</div></div>
            <div><div style="font-size:1.3rem;font-weight:700;color:var(--color-accent)">${myToday.duration ? Math.round(myToday.duration / 60) + 'm' : '0m'}</div><div style="font-size:0.65rem;color:var(--color-text-secondary)">Tiempo</div></div>
          </div>
        ` : `
          <div style="padding:12px;color:var(--color-text-secondary)">
            <div style="font-size:1.5rem;margin-bottom:4px">🏋️</div>
            <div style="font-size:0.85rem">Aún no has entrenado hoy</div>
            <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="App.startEmptyWorkout()">¡Entrenar ahora!</button>
          </div>
        `}
      </div>`;

    // Today's leaderboard
    if (todayDetail.length) {
      html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:8px;color:var(--color-text-secondary)">🏆 Ranking de Hoy</div>`;
      todayDetail.forEach((entry, i) => {
        const isMe = entry.userId === user.cloudId;
        html += `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isMe ? 'var(--color-accent-dim)' : 'var(--color-bg-card)'};border:1px solid ${isMe ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:10px;margin-bottom:6px">
            <span style="font-weight:700;width:24px;text-align:center;color:${i === 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)'}">#${i + 1}</span>
            <span style="font-weight:600;font-size:0.85rem;flex:1;${isMe ? 'color:var(--color-accent)' : ''}">${isMe ? 'Tú' : (entry.name || '?')}</span>
            <span style="font-size:0.8rem;font-weight:700;color:var(--color-accent)">${this._formatVol(entry.volume || 0)}</span>
          </div>`;
      });
    } else {
      html += `
        <div style="text-align:center;padding:20px;color:var(--color-text-tertiary)">
          <div style="font-size:1.5rem;margin-bottom:8px">😴</div>
          <div style="font-size:0.8rem">Nadie ha registrado actividad hoy aún</div>
        </div>`;
    }

    return html;
  },

  renderFriends() {
    const friends = Storage.getFriends();
    const comparison = Storage.getFriendsWeeklyComparison();
    const friendCode = Storage.generateFriendCode();

    let html = `
      <!-- Friend Code Section -->
      <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:0.7rem;color:var(--color-text-tertiary);margin-bottom:8px">TU CÓDIGO DE AMIGO</div>
        <div style="font-size:0.85rem;font-family:monospace;letter-spacing:1px;background:var(--color-bg-input);padding:8px 16px;border-radius:8px;margin-bottom:12px;word-break:break-all;color:var(--color-accent);font-weight:600">${friendCode}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary btn-sm" onclick="CompetitionScreen.copyFriendCode()">📋 Copiar</button>
          <button class="btn btn-outline btn-sm" onclick="CompetitionScreen.showJoinFriendModal()">🔗 Agregar Amigo</button>
        </div>
      </div>`;

    if (!friends.length) {
      html += `
        <div style="text-align:center;padding:24px;color:var(--color-text-secondary)">
          <div style="font-size:3rem;margin-bottom:12px">🤝</div>
          <p style="font-size:0.9rem;margin-bottom:4px;font-weight:600">Aún no tienes amigos</p>
          <p style="font-size:0.75rem;color:var(--color-text-tertiary);max-width:240px;margin:0 auto 16px">
            Comparte tu código para comparar estadísticas semanales sin necesidad de competencia formal.
          </p>
          <button class="btn btn-primary btn-sm" onclick="CompetitionScreen.showJoinFriendModal()">Agregar Primer Amigo</button>
        </div>`;
      return html;
    }

    // Weekly comparison cards
    const user = Storage.getUser();
    const maxVol = Math.max(...comparison.map(c => c.volume || 0), 1);
    const myEntry = comparison.find(c => c.isMe);
    const myRank = comparison.findIndex(c => c.isMe) + 1;

    html += `
      <div style="font-size:0.8rem;font-weight:600;margin-bottom:8px;color:var(--color-text-secondary)">📊 Comparación Semanal</div>`;

    comparison.forEach((entry, i) => {
      const isMe = entry.isMe;
      const barWidth = maxVol > 0 ? Math.max(5, Math.round((entry.volume / maxVol) * 100)) : 5;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const hasData = entry.volume > 0 || entry.workouts > 0;

      html += `
        <div style="background:${isMe ? 'var(--color-accent-dim)' : 'var(--color-bg-card)'};border:1px solid ${isMe ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:12px;padding:14px 16px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:36px;height:36px;border-radius:50%;background:${isMe ? 'var(--color-accent)' : 'var(--color-bg-input)'};display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;color:${isMe ? '#000' : 'var(--color-text)'};flex-shrink:0">
              ${(entry.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.85rem;font-weight:600;${isMe ? 'color:var(--color-accent)' : ''}">${isMe ? 'Tú' : (entry.name || '???')} ${medal}</div>
              <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${hasData ? `${entry.workouts} entrenos esta semana` : 'Sin datos aún'}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;display:flex;align-items:center;gap:8px">
              <div>
                <div style="font-size:1rem;font-weight:700;color:var(--color-accent)">${this._formatVol(entry.volume)}</div>
                ${entry.streak != null && entry.streak > 0 ? `<div style="font-size:0.65rem;color:var(--color-text-tertiary)">🔥 ${entry.streak} días</div>` : ''}
              </div>
              ${!isMe ? `<button class="btn btn-ghost btn-icon" style="font-size:0.7rem;padding:4px 6px" onclick="CompetitionScreen.confirmRemoveFriend('${entry.userId}', '${(entry.name || '').replace(/'/g, "\\'")}')" title="Eliminar">✕</button>` : ''}
            </div>
          </div>
          <div style="height:6px;background:var(--color-bg-input);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barWidth}%;background:${isMe ? 'var(--color-accent)' : 'var(--color-accent-dim)'};border-radius:3px;transition:width 0.8s ease"></div>
          </div>
        </div>`;
    });

    // Weekly summary
    if (comparison.length > 1) {
      const topFriend = comparison.find(c => !c.isMe && c.volume > 0);
      const me = comparison.find(c => c.isMe);
      if (me && topFriend) {
        const diff = me.volume - topFriend.volume;
        const msg = diff > 0
          ? `💪 Llevas ${this._formatVol(Math.abs(diff))} más que ${topFriend.name} esta semana`
          : diff < 0
            ? `👀 ${topFriend.name} te lleva ${this._formatVol(Math.abs(diff))} esta semana — ¡a darle!`
            : `🤝 Empate técnico con ${topFriend.name} esta semana`;
        html += `
          <div style="text-align:center;padding:12px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:10px;margin-top:8px;font-size:0.8rem;color:var(--color-text-secondary)">${msg}</div>`;
      }
    }

    return html;
  },

  renderMembers(comp) {
    const user = Storage.getUser();
    const members = comp.members || [];
    const code = Storage.generateCompetitionCode(comp);

    let html = `
      <!-- Invite Code -->
      <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:0.7rem;color:var(--color-text-tertiary);margin-bottom:8px">CÓDIGO DE INVITACIÓN</div>
        <div style="font-size:0.85rem;font-family:monospace;letter-spacing:1px;background:var(--color-bg-input);padding:8px 16px;border-radius:8px;margin-bottom:12px;word-break:break-all;color:var(--color-accent);font-weight:600">${code}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary btn-sm" onclick="CompetitionScreen.copyCode('${code}')">📋 Copiar</button>
          <button class="btn btn-outline btn-sm" onclick="CompetitionScreen.shareInvite('${comp.name}')">📤 Compartir</button>
        </div>
      </div>`;

    // Members list
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:8px;color:var(--color-text-secondary)">Miembros (${members.length})</div>`;
    members.forEach(m => {
      const isMe = m.userId === user.cloudId;
      const joined = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('es-ES') : '';
      html += `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-bg-card);border:1px solid ${isMe ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:10px;margin-bottom:6px">
          <div style="width:36px;height:36px;border-radius:50%;background:${isMe ? 'var(--color-accent)' : 'var(--color-bg-input)'};display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;color:${isMe ? '#000' : 'var(--color-text)'}">
            ${(m.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="font-size:0.85rem;font-weight:600;${isMe ? 'color:var(--color-accent)' : ''}">${isMe ? 'Tú' : (m.name || 'Desconocido')}</div>
            <div style="font-size:0.65rem;color:var(--color-text-tertiary)">Unido ${joined}</div>
          </div>
        </div>`;
    });

    return html;
  },

  // === Actions ===

  switchTab(tab) {
    this._activeTab = tab;
    this.render();
  },

  selectComp(compId) {
    this._selectedCompId = compId;
    this.render();
  },

  setRange(days) {
    this._leaderboardRange = days;
    this.render();
  },

  showCreateModal() {
    Modal.show(`
      <div style="padding:4px 0">
        <div class="input-group" style="margin-bottom:16px">
          <label class="input-label">Nombre de la competencia</label>
          <input class="input" id="comp-name" placeholder="Ej: Reto Verano 💪" maxlength="30">
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="CompetitionScreen.createCompetition()">Crear 🏅</button>
        </div>
      </div>
    `, { title: '🏅 Nueva Competencia' });
    setTimeout(() => { const el = document.getElementById('comp-name'); if (el) el.focus(); }, 300);
  },

  createCompetition() {
    const name = document.getElementById('comp-name')?.value.trim();
    if (!name) { Toast.show('Ingresa un nombre', 'warning'); return; }
    const user = Storage.getUser();
    const comp = Storage.addCompetition({
      name,
      creator: user.name,
      members: [{ userId: user.cloudId, name: user.name, joinedAt: new Date().toISOString() }],
    });
    this._selectedCompId = comp.id;
    Modal.hide();
    Toast.show(`🏆 "${name}" creada! Comparte el código con tus amigos`, 'success', 5000);
    this.render();
  },

  showJoinModal() {
    Modal.show(`
      <div style="padding:4px 0">
        <div class="input-group" style="margin-bottom:16px">
          <label class="input-label">Código de invitación</label>
          <input class="input" id="comp-join-code" placeholder="Pega el código aquí..." style="font-family:monospace">
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="CompetitionScreen.joinCompetition()">Unirse 🔗</button>
        </div>
      </div>
    `, { title: '🔗 Unirse a Competencia' });
  },

  joinCompetition() {
    const code = document.getElementById('comp-join-code')?.value.trim();
    if (!code) { Toast.show('Ingresa un código', 'warning'); return; }
    const comp = Storage.joinCompetition(code);
    if (!comp) {
      Toast.show('Código inválido o corrupto', 'error');
      return;
    }
    this._selectedCompId = comp.id;
    Modal.hide();
    Toast.show(`🏆 Te uniste a "${comp.name}"!`, 'success');
    this.render();
  },

  copyCode(code) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        Toast.show('📋 Código copiado', 'success');
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.show('📋 Código copiado', 'success');
    }
  },

  shareInvite(compName) {
    const code = Storage.generateCompetitionCode(Storage.getCompetition(this._selectedCompId));
    if (navigator.share) {
      navigator.share({
        title: 'GravityFit Competencia',
        text: `🏆 ¡Únete a mi competencia "${compName}" en GravityFit!\n\nCódigo: ${code}\n\nAbre GravityFit → Competencia → Unirse con código`,
      }).catch(() => {});
    } else {
      this.copyCode(code);
      Toast.show('Código copiado — compártelo por tu messenger favorito', 'info', 4000);
    }
  },

  showSettingsModal() {
    const comp = Storage.getCompetition(this._selectedCompId);
    if (!comp) return;

    Modal.show(`
      <div style="padding:4px 0">
        <button class="btn btn-ghost btn-block" style="text-align:left;color:var(--color-text-secondary);margin-bottom:8px" onclick="CompetitionScreen.showShareModal()">
          📤 Compartir Competencia
        </button>
        <button class="btn btn-ghost btn-block" style="text-align:left;color:var(--color-text-secondary);margin-bottom:8px" onclick="CompetitionScreen.syncToFirebase()">
          ☁️ Sincronizar con la nube
        </button>
        <button class="btn btn-ghost btn-block" style="text-align:left;color:var(--color-danger)" onclick="CompetitionScreen.confirmDelete()">
          🗑️ Eliminar Competencia
        </button>
      </div>
    `, { title: '⚙️ Opciones' });
  },

  showShareModal() {
    const comp = Storage.getCompetition(this._selectedCompId);
    if (!comp) return;
    const code = Storage.generateCompetitionCode(comp);

    if (navigator.share) {
      navigator.share({
        title: `GravityFit — ${comp.name}`,
        text: `🏆 ¡Únete a "${comp.name}" en GravityFit!\n\nCódigo: ${code}\n\nAbre GravityFit → Competencia → Unirse con código`,
      }).catch(() => {});
      Modal.hide();
    } else {
      this.copyCode(code);
      Modal.hide();
    }
  },

  syncToFirebase() {
    if (typeof CloudSync === 'undefined' || !CloudSync.db) {
      Toast.show('Firebase no disponible — verifica tu conexión', 'error');
      return;
    }
    Toast.show('☁️ Sincronizando...', 'info');
    CloudSync.syncUp().then(() => {
      Toast.show('✅ Datos sincronizados', 'success');
      Modal.hide();
    }).catch(e => {
      Toast.show('Error al sincronizar: ' + e.message, 'error');
    });
  },

  confirmDelete() {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary)">¿Eliminar esta competencia? Los datos se perderán.</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-danger flex-1" onclick="CompetitionScreen.deleteCompetition()">Eliminar</button>
      </div>
    `, { title: '¿Eliminar?', center: true });
  },

  deleteCompetition() {
    const comps = Storage.getCompetitions().filter(c => c.id !== this._selectedCompId);
    Storage.saveCompetitions(comps);
    this._selectedCompId = comps.length ? comps[0].id : null;
    Modal.hide();
    Toast.show('Competencia eliminada');
    this.render();
  },

  // === Friends Helpers ===

  copyFriendCode() {
    const code = Storage.generateFriendCode();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        Toast.show('📋 Código de amigo copiado', 'success');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.show('📋 Código de amigo copiado', 'success');
    }
  },

  showJoinFriendModal() {
    Modal.show(`
      <div style="padding:4px 0">
        <div class="input-group" style="margin-bottom:16px">
          <label class="input-label">Código de amigo</label>
          <input class="input" id="friend-join-code" placeholder="Pega el código aquí..." style="font-family:monospace">
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="CompetitionScreen.joinFriend()">Agregar 🤝</button>
        </div>
      </div>
    `, { title: '🤝 Agregar Amigo' });
  },

  joinFriend() {
    const code = document.getElementById('friend-join-code')?.value.trim();
    if (!code) { Toast.show('Ingresa un código', 'warning'); return; }
    const result = Storage.joinFriend(code);
    if (!result || result.error === 'invalid') {
      Toast.show('Código inválido — asegúrate de copiar el código completo', 'error');
      return;
    }
    if (result.error === 'duplicate') {
      Toast.show('Ya tienes a esa persona como amigo', 'info');
      Modal.hide();
      return;
    }
    Modal.hide();
    Toast.show(`🤝 ¡${result.friend.name} agregado como amigo!`, 'success');
    this.render();
  },

  confirmRemoveFriend(userId, name) {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary)">¿Eliminar a ${name} de tus amigos?</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-danger flex-1" onclick="CompetitionScreen.removeFriend('${userId}')">Eliminar</button>
      </div>
    `, { title: '¿Eliminar amigo?', center: true });
  },

  removeFriend(userId) {
    Storage.removeFriend(userId);
    Modal.hide();
    Toast.show('Amigo eliminado');
    this.render();
  },

  // === Helpers ===

  _formatVol(v) {
    if (!v) return '0';
    const user = Storage.getUser();
    const units = user.units || 'kg';
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M ' + units;
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k ' + units;
    return v + ' ' + units;
  },
};
