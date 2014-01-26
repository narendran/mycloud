#!/usr/bin/python

import httplib
import json
import oauth2 as oauth
import time
import urllib
import urlparse

# Figure out a way to store these securely instead of having it open on github.
CLIENT_ID = '690836899812-0uhjbi8s679d7nlpou7ku325v09gdmrt.apps.googleusercontent.com'
CLIENT_SECRET = 'QOBVhB2UUwWyy3XN8h0vLezn'

ACCESS_TOKEN_URL = 'https://accounts.google.com/o/oauth2/token'
AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/auth'
AUTHORIZE_URL_PARAMS = {
  'response_type': 'code',
  'client_id': CLIENT_ID,
  'redirect_uri': 'urn:ietf:wg:oauth:2.0:oob',
  'scope': 'https://www.googleapis.com/auth/userinfo.email'
}

CONTROLLER_AUTH_URL = 'http://localhost:5000/api/v1/authme'


class GoogleDriveLogin:
  def __init__(self):
    self._access_token = None
    #self._consumer = oauth.Consumer(key=CONSUMER_KEY,
    #    secret=CONSUMER_SECRET)
    self._connection = httplib.HTTPSConnection('accounts.google.com')

  def authenticate(self):
    if self._access_token is not None:
        return

    # client = oauth.Client(self._consumer)
    # resp, content = client.request(REQUEST_TOKEN_URL, 'GET')

    # if resp['status'] != '200':
    #     raise Exception('Invalid response %s.' % resp)

    # request_token = dict(urlparse.parse_qsl(content))

    print 'Go to the following link in your browser:'
    print '%s?%s' % (AUTHORIZE_URL, urllib.urlencode(AUTHORIZE_URL_PARAMS))
    print

    accepted = 'n'
    while accepted.lower() == 'n':
        accepted = raw_input('Have you authorized me? (y/n) ')

    code = raw_input('What is the verifier code?')
    urlparams = {
      'code': code,
      'client_id': CLIENT_ID,
      'client_secret': CLIENT_SECRET,
      'redirect_uri': 'urn:ietf:wg:oauth:2.0:oob',
      'grant_type': 'authorization_code'
    }

    print urllib.urlencode(urlparams)
    self._connection.request('POST', ACCESS_TOKEN_URL,
        body=urllib.urlencode(urlparams),
        headers={"Content-type": "application/x-www-form-urlencoded"})
    response = self._connection.getresponse().read()
    print response

    parsed_response = json.loads(response)
    self._access_token = parsed_response['access_token']

    x = urllib.urlopen('%s?%s' % (CONTROLLER_AUTH_URL,
          urllib.urlencode({'access_token': self._access_token})))
    print x.read()
    print x.info()

  def getinfo(self):
    pass

if __name__ == '__main__':
  gdl = GoogleDriveLogin()
  gdl.authenticate()
