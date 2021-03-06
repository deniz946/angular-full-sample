import {TestBed, getTestBed, async, inject} from '@angular/core/testing';
import {MockBackend, MockConnection} from '@angular/http/testing';
import {
  BaseRequestOptions,
  Response,
  HttpModule,
  Http,
  XHRBackend,
  RequestMethod,
  ResponseOptions
} from '@angular/http';
import {OAuthService} from '../services/oauth.service';
import {AuthService} from '../services/auth.service';
import {AuthHelper} from '../services/auth.helper';
import {authFactory} from '../factories/auth.factory';
import {CommonUtil} from '../utilities/common.util';
import {MocksUtil} from '../utilities/mocks.util';

describe('OAuthService', () => {
  let mockBackend: MockBackend;
  const expectedUrl = 'http://localhost:3000/api/oauth/token';
  const apiConfig = MocksUtil.createMockedApiConfig();
  const mockResponse = MocksUtil.createMockedOauthToken();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: 'api.config', useValue: apiConfig},
        {provide: 'defaultLanguage', useValue: 'en'},
        MockBackend,
        BaseRequestOptions,
        {
          provide: Http,
          deps: [MockBackend, BaseRequestOptions],
          useFactory: (backend: XHRBackend, defaultOptions: BaseRequestOptions) => {
            return new Http(backend, defaultOptions);
          }
        },
        {provide: 'AuthService', useFactory: authFactory, deps: [Http]},
        AuthHelper,
        OAuthService
      ],
      imports: [HttpModule]
    });
    mockBackend = getTestBed().get(MockBackend);
  });

  it('should create an instance of the service',
    inject([OAuthService], (service: AuthService) => {
      expect(service).toBeTruthy();
    }));

  it('should get oauth token', async(
    inject([OAuthService, AuthHelper], (service: AuthService, authHelper: AuthHelper) => {
      const username = 'fakeUserId', password = 'fakePassword';

      mockBackend.connections.subscribe((connection: MockConnection) => {
        const data = 'grant_type=password&username=' + username + '&password=' + password;
        const authorization = 'Basic ' + btoa(apiConfig.credentials.clientId + ':' + apiConfig.credentials.clientSecret);

        expect(connection.request.method).toBe(RequestMethod.Post);
        expect(connection.request.url).toEqual(expectedUrl);
        expect(connection.request.getBody()).toEqual(data);
        expect(connection.request.headers.get('Content-Type')).toEqual('application/x-www-form-urlencoded');
        expect(connection.request.headers.get('Authorization')).toEqual(authorization);
        connection.mockRespond(new Response(new ResponseOptions({body: mockResponse})));
      });

      service.login(username, password).subscribe((userData) => {
        expect(userData.access_token).toEqual(mockResponse.access_token);
        expect(userData.token_type).toEqual(mockResponse.token_type);
        expect(userData.expires_in).toEqual(mockResponse.expires_in);
        expect(userData.refresh_token).toEqual(mockResponse.refresh_token);
        expect(userData.scope).toEqual(mockResponse.scope);

        expect(authHelper.getUserLogged()).toEqual(username);
        expect(authHelper.getToken()).toEqual(mockResponse.access_token);
      });
    })));

  it('should logout from the application', async(
    inject([OAuthService, AuthHelper], (service: AuthService, authHelper: AuthHelper) => {
      const token = 'aaabbbccc';
      const userId = 'testUser';
      const seconds = 5;
      const expiredTimeString = CommonUtil.changeExpiredTime(seconds);
      document.cookie = AuthHelper.TOKEN_ID + '=' + token + '; expires=' + expiredTimeString + '; path=/';
      document.cookie = AuthHelper.USER_ID + '=' + userId + '; expires=' + expiredTimeString + '; path=/';

      service.logout();

      expect(authHelper.getUserLogged()).toEqual('');
      expect(authHelper.getToken()).toEqual('');
    })));
});
