import { Component } from 'react';


class SessionStateSaver extends Component {
  componentDidMount() {
    window.addEventListener('beforeunload', this._onBeforeUnload);
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this._onBeforeUnload);
  }

  _onBeforeUnload = () => {
    this._saveState();
  }

  _saveState = (state) => {
    try {
      window.sessionStorage.setItem(this.props.storageKey, JSON.stringify(state));
    }
    catch (ex) {}
  }

  _restoreState = () => {
    try {
      return (JSON.parse(window.sessionStorage.setItem(this.props.storageKey) || 'null') || null);
    }
    catch (ex) {
      return null;
    }
  }

  _resetState = () => {
    try {
      window.sessionStorage.removeItem(this.props.storageKey);
    }
    catch (ex) {}
  }

  render() {
    return this.props.render({
      saveState: this._saveState,
      restoreState: this._restoreState,
      resetState: this._resetState,
    });
  }
}


export default SessionStateSaver;
