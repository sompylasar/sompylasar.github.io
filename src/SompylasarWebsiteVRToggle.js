import { Component } from 'react';


class SompylasarWebsiteVRToggle extends Component {
  constructor(...args) {
    super(...args);

    this.state = {
      isVR: this._checkUrlVR(),
    };
  }

  _checkUrlVR() {
    return /^[#]?vr$/.test(window.location.hash);
  }

  _updateUrlVR() {
    if (this.state.isVR && !this._checkUrlVR()) {
      window.location.hash = 'vr';
    }
    else if (!this.state.isVR && this._checkUrlVR()) {
      window.location.hash = '';
    }
  }

  _onHashChange = () => {
    this.setState((state) => ({
      isVR: this._checkUrlVR(),
    }));
  }

  _onKeyDown = (event) => {
    if (event.keyCode === 27) {
      this.setState((state) => ({
        isVR: false,
      }));
    }
  }

  _onEnterVRHover = (event) => {
    if (this._enterButtonEl) {
      this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
    }
  }

  _onEnterVRClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this._enterButtonEl) {
      this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
    }
    window.sessionStorage.removeItem('SompylasarWebsiteVRContent.state');
    this.setState((state) => ({
      isVR: !state.isVR,
    }));
  }

  _onDocumentClick = (event) => {
    if (!this.state.isVR) {
      window.sessionStorage.removeItem('SompylasarWebsiteVRContent.state');
    }
    if (this._enterButtonEl) {
      this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
    }
  }

  componentDidMount() {
    this._enterButtonEl = document.getElementById('sompylasar-website-enter-vr');
    if (this._enterButtonEl) {
      this._enterButtonEl.style.cursor = 'pointer';
      this._enterButtonEl.addEventListener('mouseenter', this._onEnterVRHover);
      this._enterButtonEl.addEventListener('touchstart', this._onEnterVRHover);
      this._enterButtonEl.addEventListener('touchmove', this._onEnterVRHover);
      this._enterButtonEl.addEventListener('click', this._onEnterVRClick);
      if (this.state.isVR) {
        this._enterButtonEl.classList.add('sompylasar-website-avatar__vr--visible');
      }
    }
    window.addEventListener('hashchange', this._onHashChange);
    window.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('click', this._onDocumentClick);
  }

  componentDidUpdate(prevState) {
    this._updateUrlVR();
    if (prevState.isVR && !this.state.isVR) {
      if (this._enterButtonEl) {
        this._enterButtonEl.classList.remove('sompylasar-website-avatar__vr--visible');
      }
    }
  }

  componentWillUnmount() {
    if (this._enterButtonEl) {
      this._enterButtonEl.style.cursor = '';
      this._enterButtonEl.removeEventListener('mouseenter', this._onEnterVRHover);
      this._enterButtonEl.removeEventListener('touchstart', this._onEnterVRHover);
      this._enterButtonEl.removeEventListener('touchmove', this._onEnterVRHover);
      this._enterButtonEl.removeEventListener('click', this._onEnterVRClick);
    }
    window.removeEventListener('hashchange', this._onHashChange);
    window.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('click', this._onDocumentClick);
  }

  render() {
    return this.props.render({ isVR: this.state.isVR });
  }
}


export default SompylasarWebsiteVRToggle;
