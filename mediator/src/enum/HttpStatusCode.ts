/**
 * HTTP status codes to be returned in Mediator's {@link Transaction} respond methods.
 */
export enum HttpStatusCode {
    Continue = 100,
    SwitchingProtocols,
    EarlyHints = 103,
    OK = 200,
    Created,
    Accepted,
    NonAuthInformation,
    NoContent,
    ResetContent,
    PartialContent,
    MultipleChoices = 300,
    MovedPermanently,
    Found,
    SeeOther,
    NotModified,
    TemporaryRedirect = 307,
    PermanentRedirect,
    BadRequest = 400,
    Unauthorized,
    PaymentRequired,
    Forbidden,
    NotFound,
    MethodNotAllowed,
    NotAcceptable,
    ProxyAuthRequired,
    RequestTimeout,
    Conflict,
    Gone,
    LengthRequierd,
    PreconditionFailed,
    PayloadTooLarge,
    URITooLong,
    UnsupportedMediaType,
    RangeNotSatisfiable,
    ExpectationFailed,
    ImATeapot,
    UnprocessableEntity = 422,
    TooEarly = 425,
    UpgradeRequired,
    PreconditionRequired = 428,
    TooManyRequests,
    RequestHeaderFieldsTooLarge = 431,
    UnavailableForLegalReasons = 451,
    InternalServerError = 500,
    NotImplemented,
    BadGateway,
    ServiceUnavailable,
    GatewayTimeout,
    HTTPVersionNotSupported,
    VariantAlsoNegotiates,
    InsufficientStorage,
    LoopDetected,
    NotExtended = 510,
    NetworkAuthRequired
}