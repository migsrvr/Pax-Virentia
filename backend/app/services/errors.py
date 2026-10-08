"""Safe, transport-independent application errors."""


class ServiceError(Exception):
    def __init__(self, status_code, code, message, field_errors=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = field_errors or []


def invalid(field, message):
    raise ServiceError(422, "invalid_parameters", "Scenario parameters are invalid.",
                       [{"field": field, "message": message}])
