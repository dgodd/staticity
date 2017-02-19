const store = new Vuex.Store({
  state: {
    connected: false,
    error: null,
    statusHash: {}
  },
  mutations: {
    setConnected (state, val) {
      state.connected = val
    },
    setError (state, val) {
      state.error = val
    },
    setStatus (state, status) {
      obj = state.statusHash[status.site] || { site: status.site, status: null, seconds: [] }
      obj.status = status.status
      obj.seconds.push(status.seconds)
      if (obj.seconds.length > 10)
        obj.seconds.shift()
      newStatus = {}
      newStatus[status.site] = obj
      state.statusHash = Object.assign({}, state.statusHash, newStatus)
    }
  }
})

var MyBar = {
  props: ['val', 'index', 'mult'],
  template: '<g class="bar" v-bind:transform="translate"><rect v-bind:height="height" v-bind:y="offset" width="3" style="fill:#aaa;"></rect></g>',
  computed: {
    height: function() {
      return this.val * this.mult
    },
    offset: function() {
      return 20 - (this.val * this.mult)
    },
    translate: function() {
      return 'translate(' + (this.index * 3) + ',0)'
    }
  }
}
Vue.component('barchart', {
  props: ['data'],
  components: {
    'bar': MyBar
  },
  template: `
	  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="chart" height="20" width="30" aria-labelledby="title" role="img">
	    <title id="title">A bart chart showing information</title>
      <bar v-for="(item,index) in data" v-bind:mult="mult" v-bind:val="item" v-bind:index="index"></bar>
	  </svg>
  `,
  computed: {
    mult: function() {
      return 20 / this.maxVal
    },
    maxVal: function() {
      var max = 0;
      for (v of this.data) {
        if (v > max) {
          max = v
        }
      }
      return max
    }
  }
})

Vue.component('status-line', {
  props: ['s'],
  template: `
    <li>
      <span>{{ s.status }}</span>
      <span>{{ s.site }}</span>
      <barchart v-bind:data="s.seconds"></barchart>
      <span>{{ lastValue }}</span>
      <span>{{ maxValue }}</span>
    </li>
  `,
  computed: {
    lastValue: function() {
      return this.s.seconds[this.s.seconds.length - 1]
    },
    maxValue: function() {
      var max = 0;
      for (v of this.s.seconds) {
        if (v > max) {
          max = v
        }
      }
      return max
    }
  }
})

var vm = new Vue({
  el: "#staticity",
  store,
  computed: Vuex.mapState({
    connected: state => state.connected,
    error: state => state.error,
    statuses: state => Object.values(state.statusHash)
  })
});

var wsUri = "ws://" + location.host + "/socket";
function initWebSocket()
{
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { 
    store.commit('setConnected', true);
  };
  websocket.onclose = function(evt) {
    store.commit('setConnected', false);
    setTimeout(function() {
      initWebSocket();
    }, 1000);
  };
  websocket.onmessage = function(evt) {
    var data = JSON.parse(evt.data)
    store.commit('setStatus', data);
  };
  websocket.onerror = function(evt) {
    store.commit('setError', evt.data);
  };
}

window.addEventListener("load", initWebSocket, false);
