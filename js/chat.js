// BioEcho Chat Engine — Evidence-backed conversation

class ChatEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.messages = [];
    this.maxMessages = 200;
  }

  addMessage(msg) {
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) this.messages.shift();
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (const msg of this.messages) {
      const el = document.createElement('div');
      el.className = `chat-msg ${msg.type || 'system'}`;

      if (msg.time) {
        const header = document.createElement('div');
        header.className = 'msg-header';
        header.innerHTML = `<span>${msg.type === 'event' ? 'Signal Event' : msg.type === 'warning' ? 'Alert' : 'System'}</span><span>${new Date(msg.time).toLocaleTimeString()}</span>`;
        el.appendChild(header);
      }

      const body = document.createElement('div');
      body.className = 'msg-body';
      body.innerHTML = msg.text;
      el.appendChild(body);

      if (msg.evidence) {
        const ev = document.createElement('div');
        ev.className = 'evidence';
        ev.innerHTML = msg.evidence;
        el.appendChild(ev);
      }

      frag.appendChild(el);
    }

    this.container.appendChild(frag);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() { this.messages = []; this._render(); }
}
