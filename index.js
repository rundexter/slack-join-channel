var _           = require('lodash')
  , agent       = require('superagent')
  , q           = require('q')
  , baseUrl     = 'https://slack.com/api/'
;

module.exports = {
    /**
     * Allows the authenticating users to follow the user specified in the ID parameter.
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var channels = step.input('channel_id')
          , token    = dexter.provider('slack').credentials('access_token')
          , self     = this
          , url      = baseUrl + 'channels.join'
          , promises = []
          , req 
          , channel
        ;

        _.each(channels, function(channel, idx) {
            promises.push(
              self.getChannel(token, channel)
                .then( function(channel) {
                  req = agent.post(url)
                          .type('form')
                          .send(_.extend({token: token, name: channel.name }))
                  ;
                
                  return promisify(req, 'end', 'body.group');
                })
            );
        });

        q.all(promises)
          .then(this.complete.bind(this))
          .catch(this.fail.bind(this))
        ;
    }

    /**
     *  Gets the full channel object either by name or id
     *
     *  @param { String } token - access token
     *  @param { String } channel - the channel id or name
     *
     *  @return { q/Promise} 
     */
    , getChannel: function(token, channel) {
        return promisify(
            agent.post(baseUrl+'channels.list')
              .type('form')
              .send({ token: token })
              , 'end', 'body.channels'
        ).then(function(channels) {
            var objChannel;
            if(channel[0] === '#') {
                objChannel=_.find(channels, { name: channel.substr(1) });
            } else {
                objChannel=_.find(channels, { id: channel });
            }

            if(objChannel)
                return objChannel;

            throw new Error("Channel not found.");
        });
    }
};

function promisify(scope, call, path) {
    var deferred = q.defer(); 

    scope[call](function(err, result) {
        return err || !_.get(result,'body.ok')
          ? deferred.reject(err || result.body)
          : deferred.resolve(_.get(result, path))
        ;
    });

    return deferred.promise;
}
