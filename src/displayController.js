// http://codeincomplete.com/posts/javascript-game-foundations-the-game-loop/
export function createDisplayController() {
  function noop() {}

  let _update = noop;
  let _render = noop;
  let _display = null;
  let _fpsmeter = null;

  let _lastTimestamp = 0;
  let _dt = 0;
  let _step = 1000 / 90;
  let _slowFactor = 1.0;
  let _slowStep = _slowFactor * _step;
  let _timer = 0;

  function frame(nowTimestamp) {
    if (!_display) { return; }
    if (_fpsmeter) { _fpsmeter.tickStart(); }
    _dt = _dt + Math.min(1000, (nowTimestamp - (_lastTimestamp || nowTimestamp)));
    while (_dt > _slowStep) {
      _dt = _dt - _slowStep;
      _update(_step);
    }
    _render(_dt / _slowFactor);
    _lastTimestamp = nowTimestamp;
    if (_fpsmeter) { _fpsmeter.tick(); }
    _timer = _display.requestAnimationFrame(frame);
  }

  function start() {
    if (!_display) { return; }
    _lastTimestamp = 0;
    _timer = _display.requestAnimationFrame(frame);
  }

  function stop() {
    if (!_display) { return; }
    _display.cancelAnimationFrame(_timer);
    _timer = 0;
  }

  return {
    setUpdate: (update) => { _update = update || noop; },
    setRender: (render) => { _render = render || noop; },
    setFps: (fps) => { _step = 1000 / fps; _slowStep = _slowFactor * _step; },
    setSlow: (slowFactor) => { _slowFactor = slowFactor; },
    setDisplay: (display) => {
      if (display === _display) { return; }
      stop();
      _display = display || null;
      start();
    },
    setFpsMeter: (fpsmeter) => { _fpsmeter = fpsmeter; },
  };
}
