import { Component } from 'react';


class StatePersister extends Component {
  constructor(props) {
    super(props);

    this._pendingState = null;
  }

  componentDidMount() {
    this._persistStateTimer = window.setInterval(this._persistState, 5000);
    window.addEventListener('beforeunload', this._onBeforeUnload);
  }

  componentWillUnmount() {
    window.clearInterval(this._persistStateTimer);
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    this._persistState();
  }

  _onBeforeUnload = (event) => {
    this._persistState();
  }

  _saveState = (state) => {
    this._pendingState = state;
  }

  _persistState = () => {
    const state = this._pendingState;
    try {
      if (state) {
        window.sessionStorage.setItem(this.props.storageKey, JSON.stringify(state));
      }
      else {
        window.sessionStorage.removeItem(this.props.storageKey);
      }
    }
    catch (ex) {}
  }

  _restoreState = () => {
    let state;
    try {
      state = (JSON.parse(window.sessionStorage.getItem(this.props.storageKey) || 'null') || null);
    }
    catch (ex) {
      state = null;
    }
    this._pendingState = state;
    return state;
  }

  render() {
    return this.props.render({
      saveState: this._saveState,
      restoreState: this._restoreState,
    });
  }
}


export default StatePersister;
