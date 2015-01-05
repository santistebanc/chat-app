App = Ember.Application.create();

App.Router.map(function() {
this.resource('room', {path:'room/:room_id'});
});

App.ApplicationAdapter = DS.FirebaseAdapter.extend({
  firebase: new Firebase('https://chat-room-test.firebaseio.com/')
  //https://chat-room-test.firebaseio.com/
});

App.Message = DS.Model.extend({
  user: DS.attr('string'),
  content: DS.attr('string'),
  date: DS.attr('date')
});

App.RoomRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('message');
  }
});

App.RoomController = Ember.ArrayController.extend({
  actions:{
    sendMessage: function(){
      var newPost = this.store.createRecord('message', {user: this.get('username'), content: this.get('message'), date: Date.now()});
      this.set('message', '')
      newPost.save();
  }
}
});
