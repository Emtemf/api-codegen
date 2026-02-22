package com.apicgen.util;

/**
 * Validation constants used throughout the application.
 * Extracts magic numbers into named constants for better maintainability.
 */
public final class ValidationConstants {

    private ValidationConstants() {
        // Prevent instantiation
    }

    // String validation defaults
    public static final int DEFAULT_MAX_LENGTH = 255;
    public static final int DEFAULT_MIN_LENGTH = 1;

    // Numeric validation defaults
    public static final double DEFAULT_MIN_VALUE = 0.0;
    public static final int DEFAULT_MAX_INTEGER = 2147483647;
    public static final int DEFAULT_MAX_LONG = 2147483647;
    public static final double DEFAULT_MAX_DOUBLE = 9999999999.0;

    // Pagination defaults
    public static final int DEFAULT_PAGE_MIN = 1;
    public static final int DEFAULT_PAGE_MAX = 2147483647;
    public static final int DEFAULT_PAGE_SIZE_MIN = 1;
    public static final int DEFAULT_PAGE_SIZE_MAX = 100;

    // List validation defaults
    public static final int DEFAULT_MIN_SIZE = 1;
    public static final int DEFAULT_MAX_SIZE = 100;

    // Common field names for smart validation
    public static final String FIELD_NAME_PAGE = "page";
    public static final String FIELD_NAME_PAGE_NUM = "pageNum";
    public static final String FIELD_NAME_PAGE_SIZE = "pageSize";
    public static final String FIELD_NAME_LIMIT = "limit";
    public static final String FIELD_NAME_SIZE = "size";

    // Phone pattern
    public static final String PHONE_PATTERN = "^(\\+86|86)?1[3-9]\\d{9}$";

    // Email detection patterns
    public static final String[] EMAIL_FIELD_PATTERNS = {"email", "mail"};
    public static final String[] PHONE_FIELD_PATTERNS = {"phone", "mobile", "tel"};
    public static final String[] BIRTH_FIELD_PATTERNS = {"birth", "dob"};
    public static final String[] SCHEDULE_FIELD_PATTERNS = {"appoint", "schedule"};

    // Age field patterns
    public static final String[] AGE_FIELD_PATTERNS = {"age"};
    public static final int DEFAULT_AGE_MIN = 0;
    public static final int DEFAULT_AGE_MAX = 150;

    // Score/rate field patterns
    public static final String[] SCORE_FIELD_PATTERNS = {"score", "rate"};
    public static final int DEFAULT_SCORE_MIN = 0;
    public static final int DEFAULT_SCORE_MAX = 100;

    // Price/amount field patterns
    public static final String[] PRICE_FIELD_PATTERNS = {"price", "amount", "total"};
}
