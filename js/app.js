Ember.Application.initializer({
  name: 'authentication',
  initialize: function(container, application) {
    container.register('authenticator:custom', App.GoogleAuthenticator);
    container.register('authorizer:custom', App.CustomAuthorizer);
    Ember.SimpleAuth.setup(container, application, {
      authorizerFactory: 'authorizer:custom',
    });
  }
});

App = Ember.Application.create();

App.Router.map(function() {
this.resource('room', {path:'room/:room_id'});
this.resource('login');
});

App.Router.reopen({
  rootURL: 'index.html'
});

App.ApplicationAdapter = DS.FirebaseAdapter.extend({
  firebase: new Firebase('https://chat-room-test.firebaseio.com/')
  //https://chat-room-test.firebaseio.com/
});


App.ApplicationRoute = Ember.Route.extend(Ember.SimpleAuth.ApplicationRouteMixin, {
  actions: {
    authenticate: function(){
      App.oauth = Ember.OAuth2.create({providerId: 'google'});
      App.oauth.authorize();
  }
}
});

App.Message = DS.Model.extend({
  user: DS.attr('string'),
  content: DS.attr('string'),
  date: DS.attr('date')
});

App.RoomRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
  model: function() {
    return this.store.findAll('message');
  }
});

App.RoomController = Ember.ArrayController.extend({
  actions:{
    sendMessage: function(){
      var newPost = this.store.createRecord('message', {user: this.get('session.userFn'), content: this.get('message'), date: Date.now()});
      this.set('message', '')
      newPost.save();
  },
  delete: function(post){
      post.deleteRecord();
      post.save(); // => DELETE to /posts/1
  }
}
});







// Simple authentication



App.LoginRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    controller.set('errorMessage', null);
  },
  actions: {
    sessionAuthenticationFailed: function(error) {
      this.controller.set('errorMessage', error);
    },
  }
});

App.LoginController = Ember.Controller.extend(Ember.SimpleAuth.LoginControllerMixin, {
  authenticatorFactory: 'authenticator:custom'
});

// The authorizer that injects the auth token into every api request
App.CustomAuthorizer = Ember.SimpleAuth.Authorizers.Base.extend({
  authorize: function(jqXHR, requestOptions) {
    if (this.get('session.isAuthenticated') && !Ember.isEmpty(this.get('session.token'))) {
      jqXHR.setRequestHeader('Authorization', 'Token: ' + this.get('session.token'));
    }
  }
});


Ember.OAuth2.config = {
  google: {
    clientId: "493285649790-o7ilvcg5vbdgi82l3erqmp33ga0cttks.apps.googleusercontent.com",
    authBaseUri: 'https://accounts.google.com/o/oauth2/auth',
    redirectUri: 'https://chat-room-test.firebaseapp.com/redirect.html',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
  }
}

App.oauth = Ember.OAuth2.create({providerId: 'google'});

App.GoogleAuthenticator = Ember.SimpleAuth.Authenticators.Base.extend({
  restore: function(data) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      if (!Ember.isEmpty(data.token)) {
        resolve(data);
      } else {
        reject();
      }
    });
  },

  get_email: function(access_token) {
    // Call the google api with our token to get the user info
    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.$.ajax({
        url:         'https://www.googleapis.com/oauth2/v2/userinfo?access_token='+access_token,
        type:        'GET',
        contentType: 'application/json'
      }).then(function(response) {
        resolve (response);
      }, function(xhr, status, error) {
        console.log(error);
        reject(error);
      });
    });
  },

  authenticate: function(credentials) {
    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      // Setup handlers
      App.oauth.on('success', function(stateObj) {
        // Setup the callback to resolve this function
        token = this.getAccessToken();
        // Get all the user info
        _this.get_email(token).then(
          function(resp) {
            resolve({ token: token,
              userEmail: resp.email,
              userFn: resp.given_name,
              userLn: resp.family_name,
              userPic: resp.picture,
              userGender: resp.gender,
            });
          },
          function(rej) {
            reject(rej);
          }
        );
      });// oauth.on
      App.oauth.on('error', function(err) { reject(err.error);});
      App.oauth.authorize();
    });// return
  },

  invalidate: function() {
    var _this = this;
    return new Ember.RSVP.Promise(function(resolve) {
      // Do something with your API
      resolve();
    });
  },
});
