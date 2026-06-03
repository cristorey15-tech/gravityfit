const Obj = {
renderFatigueWidget() {
    if (typeof window.AICoach === 'undefined') return '';
    const fatigue = window.AICoach.getMuscleFatigue();
    if (!Object.keys(fatigue).length) return '';

    const getFatigueColor = (pct) => {
      if (!pct || pct === 0) return 'rgba(255,255,255,0.05)';
      let r, g, b;
      if (pct <= 33) {
        r = Math.round(34 + (pct / 33) * 187);
        g = Math.round(197 - (pct / 33) * 17);
        b = Math.round(94 - (pct / 33) * 60);
      } else if (pct <= 66) {
        const t = (pct - 33) / 33;
        r = Math.round(221 + t * 34);
        g = Math.round(180 - t * 92);
        b = Math.round(34 - t * 34);
      } else {
        const t = (pct - 66) / 34;
        r = 255;
        g = Math.round(88 - t * 68);
        b = Math.round(t * 10);
      }
      return `rgba(${r},${g},${b},${0.3 + (pct / 100) * 0.6})`;
    };

    const mf = (name) => {
      const pct = fatigue[name] || 0;
      return pct > 0 ? getFatigueColor(pct) : 'rgba(255,255,255,0.04)';
    };

    const me = (d, name, extra) => {
      const pct = fatigue[name] || 0;
      const glow = pct > 60 ? 'filter="url(#glow)"' : '';
      return '<path d="' + d + '" fill="' + mf(name) + '" stroke="rgba(255,255,255,' + (pct > 0 ? 0.2 : 0.08) + ')" stroke-width="0.6" stroke-linejoin="round" style="cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="HomeScreen.showMuscleDetail(\'' + name + '\')" ' + (extra || '') + ' ' + glow + '/>';
    };
    const ne = (d) => '<path d="' + d + '" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5" stroke-linejoin="round"/>';
    const bo = (d) => '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-linejoin="round"/>';

    const frontView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + '<defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + bo('M70,8 C78,8 84,14 84,24 C84,34 78,42 74,44 L82,48 C92,48 100,52 100,58 L104,78 C108,88 106,96 102,100 L94,114 L90,132 L84,140 L78,142 L82,168 C84,188 86,208 84,224 L82,244 C82,250 78,256 74,256 L66,256 C62,256 58,250 58,244 L56,224 C54,208 56,188 58,168 L62,142 L56,140 L50,132 L46,114 L38,100 C34,96 32,88 36,78 L40,58 C40,52 48,48 58,48 L66,44 C62,42 56,34 56,24 C56,14 62,8 70,8 Z')
      + ne('M70,8 C80,8 87,16 87,26 C87,36 80,44 70,44 C60,44 53,36 53,26 C53,16 60,8 70,8 Z')
      + me('M56,40 L70,38 L84,40 L86,46 L82,50 L70,48 L58,50 L54,46 Z', 'trapecios')
      + me('M42,46 C36,46 30,50 30,58 C30,64 34,68 40,68 L50,62 L54,50 L48,46 Z', 'hombros')
      + me('M98,46 C104,46 110,50 110,58 C110,64 106,68 100,68 L90,62 L86,50 L92,46 Z', 'hombros')
      + me('M54,50 C54,48 60,46 68,46 L70,46 C70,46 70,48 70,52 L70,70 C70,74 64,76 58,74 L54,70 L54,50 Z', 'pecho')
      + me('M86,50 C86,48 80,46 72,46 L70,46 C70,46 70,48 70,52 L70,70 C70,74 76,76 82,74 L86,70 L86,50 Z', 'pecho')
      + me('M34,64 C30,66 26,72 26,80 C26,88 30,94 34,94 L42,92 L44,80 L44,68 Z', 'biceps')
      + me('M106,64 C110,66 114,72 114,80 C114,88 110,94 106,94 L98,92 L96,80 L96,68 Z', 'biceps')
      + me('M58,72 L82,72 L82,74 L70,76 L58,74 Z M58,78 L82,78 L82,96 L58,96 Z M58,98 L70,100 L70,118 L58,116 Z M70,100 L82,98 L82,116 L70,118 Z M58,120 L82,120 L80,136 L60,136 Z', 'core')
      + me('M24,96 C20,100 16,108 16,116 C16,122 18,128 22,130 L28,128 L30,118 L34,100 Z', 'antebrazos')
      + me('M116,96 C120,100 124,108 124,116 C124,122 122,128 118,130 L112,128 L110,118 L106,100 Z', 'antebrazos')
      + ne('M18,132 C14,136 12,140 14,142 L22,140 L26,132 Z')
      + ne('M122,132 C126,136 128,140 126,142 L118,140 L114,132 Z')
      + me('M56,136 L84,136 L86,148 L84,152 L56,152 L54,148 Z', 'abductores')
      + me('M56,152 C54,156 50,170 48,186 C46,200 48,214 50,224 L56,224 C58,214 60,200 60,186 C60,170 58,156 56,152 Z', 'cuadriceps')
      + me('M84,152 C86,156 90,170 92,186 C94,200 92,214 90,224 L84,224 C82,214 80,200 80,186 C80,170 82,156 84,152 Z', 'cuadriceps')
      + me('M50,228 C48,234 48,244 50,250 L58,250 C58,244 58,234 56,228 Z', 'pantorrillas')
      + me('M90,228 C92,234 92,244 90,250 L82,250 C82,244 82,234 84,228 Z', 'pantorrillas')
      + ne('M46,252 C44,254 44,258 48,258 L58,258 L60,252 Z')
      + ne('M94,252 C96,254 96,258 92,258 L82,258 L80,252 Z')
      + '</svg>';

    const backView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + '<defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + bo('M70,8 C78,8 84,14 84,24 C84,34 78,42 74,44 L82,48 C92,48 100,52 100,58 L104,78 C108,88 106,96 102,100 L94,114 L90,132 L84,140 L78,142 L82,168 C84,188 86,208 84,224 L82,244 C82,250 78,256 74,256 L66,256 C62,256 58,250 58,244 L56,224 C54,208 56,188 58,168 L62,142 L56,140 L50,132 L46,114 L38,100 C34,96 32,88 36,78 L40,58 C40,52 48,48 58,48 L66,44 C62,42 56,34 56,24 C56,14 62,8 70,8 Z')
      + ne('M70,8 C80,8 87,16 87,26 C87,36 80,44 70,44 C60,44 53,36 53,26 C53,16 60,8 70,8 Z')
      + me('M56,38 L70,36 L84,38 L88,46 L90,54 L70,56 L50,54 L52,46 Z', 'trapecios')
      + me('M42,48 C36,48 30,52 30,58 C30,64 34,68 40,68 L50,62 L52,52 L46,48 Z', 'hombros')
      + me('M98,48 C104,48 110,52 110,58 C110,64 106,68 100,68 L90,62 L88,52 L94,48 Z', 'hombros')
      + me('M52,56 C50,58 48,64 48,72 L48,86 C48,90 54,94 62,94 L70,96 L78,94 C86,94 92,90 92,86 L92,72 C92,64 90,58 88,56 L70,58 Z', 'espalda')
      + me('M34,64 C30,66 26,72 26,80 C26,88 30,94 34,94 L42,90 L44,80 L44,68 Z', 'triceps')
      + me('M106,64 C110,66 114,72 114,80 C114,88 110,94 106,94 L98,90 L96,80 L96,68 Z', 'triceps')
      + '<path d="M62,90 L62,132 M78,90 L78,132" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.6"/>'
      + me('M52,96 C50,98 46,104 46,112 C46,120 50,126 56,126 L68,124 L70,100 Z', 'gluteos')
      + me('M88,96 C90,98 94,104 94,112 C94,120 90,126 84,126 L72,124 L70,100 Z', 'gluteos')
      + me('M24,96 C20,100 16,108 16,116 C16,122 18,128 22,130 L28,128 L30,118 L34,100 Z', 'antebrazos')
      + me('M116,96 C120,100 124,108 124,116 C124,122 122,128 118,130 L112,128 L110,118 L106,100 Z', 'antebrazos')
      + ne('M18,132 C14,136 12,140 14,142 L22,140 L26,132 Z')
      + ne('M122,132 C126,136 128,140 126,142 L118,140 L114,132 Z')
      + me('M52,128 C48,140 46,160 46,180 C46,200 48,214 50,224 L58,224 C60,214 62,200 62,186 C62,170 60,152 58,136 Z', 'femorales')
      + me('M88,128 C92,140 94,160 94,180 C94,200 92,214 90,224 L82,224 C80,214 78,200 78,186 C78,170 80,152 82,136 Z', 'femorales')
      + me('M48,228 C44,234 42,240 44,246 C46,250 50,252 54,250 C58,246 58,240 56,228 Z', 'pantorrillas')
      + me('M92,228 C96,234 98,240 96,246 C94,250 90,252 86,250 C82,246 82,240 84,228 Z', 'pantorrillas')
      + ne('M46,252 C44,254 44,258 48,258 L58,258 L60,252 Z')
      + ne('M94,252 C96,254 96,258 92,258 L82,258 L80,252 Z')
      + '</svg>';

    const highFatigue = Object.entries(fatigue).filter(([,v]) => v > 50).sort((a,b) => b[1]-a[1]);
    const pills = highFatigue.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px">'
          + highFatigue.map(([n, p]) => '<span style="font-size:0.65rem;padding:3px 10px;border-radius:10px;background:' + getFatigueColor(p) + ';color:var(--color-text);cursor:pointer;font-weight:500" onclick="HomeScreen.showMuscleDetail(\'' + n + '\')">' + n + ' ' + p + '%</span>').join('')
          + '</div>'
      : '';

    return '\n      <div class="fatigue-widget" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:16px;padding:16px;margin-bottom:16px">\n'
      + '        <div class="home-section-title" style="margin-bottom:10px">\n'
      + '          <span>\u{1FAC0} Mapa de Fatiga (72h)</span>\n'
      + '          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">Toca un m\u00FAsculo para ver detalles</span>\n'
      + '        </div>\n'
      + '        <div style="display:flex;gap:16px;justify-content:center;align-items:flex-start">\n'
      + '          <div style="text-align:center">\n'
      + '            ' + frontView + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Frontal</div>\n'
      + '          </div>\n'
      + '          <div style="text-align:center">\n'
      + '            ' + backView + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Posterior</div>\n'
      + '          </div>\n'
      + '        </div>\n'
      + '        <div style="margin:10px auto 6px;max-width:220px">\n'
      + '          <div style="height:6px;border-radius:3px;background:linear-gradient(to right, rgba(34,197,94,0.6), rgba(250,204,21,0.6), rgba(239,68,68,0.7));"></div>\n'
      + '          <div style="display:flex;justify-content:space-between;font-size:0.55rem;color:var(--color-text-tertiary);margin-top:2px">\n'
      + '            <span>\u{1F7E2} Recuperado</span>\n'
      + '            <span>\u{1F7E1} Moderado</span>\n'
      + '            <span>\u{1F534} Alto</span>\n'
      + '          </div>\n'
      + '        </div>\n'
      + pills + '\n'
      + '        <div style="font-size:0.55rem;color:var(--color-text-tertiary);margin-top:8px;text-align:center;opacity:0.7">Basado en volumen de los \u00FAltimos 3 d\u00EDas</div>\n'
      + '      </div>';
  }
};
