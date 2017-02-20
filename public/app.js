const store = new Vuex.Store({
  state: {
    connected: false,
    error: null,
    sites: {},
    statusHash: {}
  },
  mutations: {
    setConnected (state, val) {
      state.connected = val
    },
    setError (state, val) {
      state.error = val
    },
    setSite (state, site) {
      state.sites[site.id] = site.name
    },
    setStatus (state, status) {
      site = state.sites[status.site_id]
      obj = state.statusHash[site] || { site: site, status: null, seconds: [] }
      obj.status = status.status
      obj.seconds.push(status.seconds)
      if (obj.seconds.length > 30)
        obj.seconds.shift()
      newStatus = {}
      newStatus[site] = obj
      state.statusHash = Object.assign({}, state.statusHash, newStatus)
    }
  }
})

var Bar = {
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
    'bar': Bar
  },
  template: `
	  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="chart" height="20" width="60" aria-labelledby="title" role="img">
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
    <tr>
      <td>{{ s.status }}</td>
      <td><barchart v-bind:data="s.seconds"></barchart></td>
      <td align="right">{{ lastValue }}</td>
      <td align="right">{{ maxValue }}</td>
      <td>{{ s.site }}</td>
    </tr>
  `,
  computed: {
    lastValue: function() {
      return this.s.seconds[this.s.seconds.length - 1].toPrecision(2)
    },
    maxValue: function() {
      var max = 0;
      for (v of this.s.seconds) {
        if (v > max) {
          max = v
        }
      }
      return max.toPrecision(2)
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
    switch(data[0]) {
      case 'site':
        store.commit('setSite', data[1]);
        break;
      case 'status':
        store.commit('setStatus', data[1]);
        break;
    }
  };
  websocket.onerror = function(evt) {
    store.commit('setError', evt.data);
  };
}

window.addEventListener("load", initWebSocket, false);
