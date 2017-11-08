import { Component } from 'react';


class SompylasarWebsiteVRAvatarToggle extends Component {
  componentDidMount() {
    this._enterButtonEl = document.getElementById('sompylasar-website-enter-vr');
    if (this._enterButtonEl) {
      this._enterButtonEl.addEventListener('mouseenter', this._onVRAvatarToggleHover);
      this._enterButtonEl.addEventListener('mouseleave', this._onVRAvatarToggleHoverOut);
      this._enterButtonEl.addEventListener('touchstart', this._onVRAvatarToggleHover);
      this._enterButtonEl.addEventListener('touchmove', this._onVRAvatarToggleHover);
      this._enterButtonEl.addEventListener('click', this._onVRAvatarToggleClick);
      this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--available');
      if (this.props.isPresentingVR) {
        this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
      }
      document.addEventListener('click', this._onVRAvatarToggleHoverOut);
    }
    window.addEventListener('keydown', this._onKeyDown);
  }

  componentDidUpdate(prevProps) {
    if (this._enterButtonEl) {
      if (this.props.isPresentingVR) {
        this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
      }
      else {
        this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
      }
    }
  }

  componentWillUnmount() {
    if (this._enterButtonEl) {
      this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
      this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--available');
      this._enterButtonEl.removeEventListener('mouseenter', this._onVRAvatarToggleHover);
      this._enterButtonEl.removeEventListener('mouseleave', this._onVRAvatarToggleHoverOut);
      this._enterButtonEl.removeEventListener('touchstart', this._onVRAvatarToggleHover);
      this._enterButtonEl.removeEventListener('touchmove', this._onVRAvatarToggleHover);
      this._enterButtonEl.removeEventListener('click', this._onVRAvatarToggleClick);
      document.removeEventListener('click', this._onVRAvatarToggleHoverOut);
    }
    window.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown = (event) => {
    if (event.keyCode === 27) {
      if (this.props.isPresentingVR) {
        this.props.onExitVRRequested();
      }
    }
  }

  _onVRAvatarToggleHover = (event) => {
    if (!this.props.isPresentingVR && this._enterButtonEl) {
      this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
    }
  }

  _onVRAvatarToggleHoverOut = () => {
    if (!this.props.isPresentingVR && this._enterButtonEl) {
      this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
    }
  }

  _onVRAvatarToggleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.props.isPresentingVR && this._enterButtonEl) {
      this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
    }
    if (this.props.isPresentingVR) {
      this.props.onExitVRRequested();
    }
    else if (this.props.isReadyToPresentVR) {
      this.props.onEnterVRRequested();
    }
  }

  render() {
    return null;
  }
}


export default SompylasarWebsiteVRAvatarToggle;
