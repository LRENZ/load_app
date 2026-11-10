// Generated from the reference frequency/risk presets (no ad unit or account identifiers).
// Source: easyloan-spec/Claude_Functionality_First/config/*.json
import type { RawAdConfig, RawRiskConfig, RawClickProtection } from './config.ts';

export const EMBEDDED_NATURAL: RawAdConfig = {
  "app_open": {
    "compete_with_interstitial": true,
    "bidding_platforms": {
      "admob": true,
      "pangle": false,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 10,
      "max_daily_click": 3
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 60
      },
      "pangle": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 60
      },
      "topon": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 60
      },
      "gam": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 60
      },
      "max": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 60
      }
    }
  },
  "interstitial": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 10,
      "max_daily_click": 3
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "topon": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "gam": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      }
    }
  },
  "native": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 10,
      "max_daily_click": 3
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "topon": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "gam": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      }
    }
  },
  "rewarded": {
    "compete_with_interstitial": true,
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 10,
      "max_daily_click": 3
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "topon": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "gam": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      }
    }
  },
  "banner": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 10,
      "max_daily_click": 3
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "topon": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "gam": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 10,
        "max_daily_click": 3,
        "min_interval": 30
      }
    }
  },
  "ad_strategies": {
    "fullscreen_native_after_interstitial": 0,
    "app_open_after_interstitial": 0
  }
};

export const EMBEDDED_PAID: RawAdConfig = {
  "app_open": {
    "compete_with_interstitial": true,
    "bidding_platforms": {
      "admob": true,
      "pangle": false,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 20,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "pangle": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "max": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      }
    }
  },
  "interstitial": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 20,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "pangle": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "max": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      }
    }
  },
  "native": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 20,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "pangle": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "max": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      }
    }
  },
  "rewarded": {
    "compete_with_interstitial": true,
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 20,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "pangle": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "max": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      }
    }
  },
  "banner": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": true,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 20,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "pangle": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "max": {
        "max_daily_show": 20,
        "max_daily_click": 10,
        "min_interval": 0
      }
    }
  },
  "ad_strategies": {
    "fullscreen_native_after_interstitial": 0,
    "app_open_after_interstitial": 0
  }
};

export const CACHED_NATURAL: RawAdConfig = {
  "app_open": {
    "bidding_platforms": {
      "admob": true,
      "pangle": false,
      "topon": false,
      "gam": false,
      "max": false
    },
    "total_frequency_limits": {
      "max_daily_show": 5,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 2,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "pangle": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "max": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      }
    }
  },
  "interstitial": {
    "bidding_platforms": {
      "admob": true,
      "pangle": false,
      "topon": false,
      "gam": false,
      "max": false
    },
    "total_frequency_limits": {
      "max_daily_show": 5,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 2,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "pangle": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "max": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      }
    }
  },
  "native": {
    "bidding_platforms": {
      "admob": true,
      "pangle": false,
      "topon": false,
      "gam": false,
      "max": false
    },
    "total_frequency_limits": {
      "max_daily_show": 5,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 2,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "pangle": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "max": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      }
    }
  },
  "rewarded": {
    "bidding_platforms": {
      "admob": false,
      "pangle": false,
      "topon": false,
      "gam": false,
      "max": false
    },
    "total_frequency_limits": {
      "max_daily_show": 0,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "pangle": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "max": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      }
    }
  },
  "banner": {
    "bidding_platforms": {
      "admob": false,
      "pangle": false,
      "topon": false,
      "gam": false,
      "max": false
    },
    "total_frequency_limits": {
      "max_daily_show": 0,
      "max_daily_click": 10
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "pangle": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      },
      "max": {
        "max_daily_show": 0,
        "max_daily_click": 10,
        "min_interval": 120
      }
    }
  },
  "ad_strategies": {
    "fullscreen_native_after_interstitial": 0,
    "app_open_after_interstitial": 0
  }
};

export const CACHED_PAID: RawAdConfig = {
  "app_open": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": false,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 50,
      "max_daily_click": 999
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 50,
        "min_interval": 60
      },
      "max": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      }
    }
  },
  "interstitial": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": false,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 50,
      "max_daily_click": 999
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 50,
        "min_interval": 60
      },
      "max": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      }
    }
  },
  "native": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": false,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 50,
      "max_daily_click": 999
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      }
    }
  },
  "rewarded": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": false,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 50,
      "max_daily_click": 999
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 60
      },
      "pangle": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 50,
        "min_interval": 60
      },
      "max": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      }
    }
  },
  "banner": {
    "bidding_platforms": {
      "admob": true,
      "pangle": true,
      "topon": true,
      "gam": false,
      "max": true
    },
    "total_frequency_limits": {
      "max_daily_show": 50,
      "max_daily_click": 999
    },
    "bidding_frequency_limits": {
      "admob": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "pangle": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "topon": {
        "max_daily_show": 50,
        "max_daily_click": 999,
        "min_interval": 0
      },
      "gam": {
        "max_daily_show": 0,
        "max_daily_click": 50,
        "min_interval": 30
      },
      "max": {
        "max_daily_show": 50,
        "max_daily_click": 50,
        "min_interval": 30
      }
    }
  },
  "ad_strategies": {
    "fullscreen_native_after_interstitial": 0,
    "app_open_after_interstitial": 0
  }
};

export const RISK_CONFIG: RawRiskConfig = {
  "behavior_mode": 1,
  "mistake_click_time": 20,
  "mistake_click_count": 2,
  "restrict_interval": 1800,
  "close_click_count": 3,
  "close_activity_class_names": [],
  "limits": {
    "app_open": {
      "request_limit": 50,
      "show_limit": 50,
      "click_limit": 50,
      "fill_fail_limit": 50
    },
    "interstitial": {
      "request_limit": 50,
      "show_limit": 50,
      "click_limit": 50,
      "fill_fail_limit": 50
    },
    "native": {
      "request_limit": 50,
      "show_limit": 50,
      "click_limit": 50,
      "fill_fail_limit": 50
    },
    "banner": {
      "request_limit": 50,
      "show_limit": 50,
      "click_limit": 50,
      "fill_fail_limit": 50
    },
    "rewarded": {
      "request_limit": 50,
      "show_limit": 50,
      "click_limit": 50,
      "fill_fail_limit": 50
    }
  },
  "vpn_ad_config": 0,
  "dns_ad_config": 0,
  "ip_ad_config": 0,
  "simulator_ad_config": 0,
  "adb_ad_config": 0,
  "sim_ad_config": 0,
  "no_gp_ad_config": 0,
  "sys_9_low_ad_config": 0,
  "play_ad_config": 0
};

export const CLICK_PROTECTION: RawClickProtection = {
  "natural": {
    "protection_enabled": false,
    "threshold": 4
  },
  "paid": {
    "protection_enabled": false,
    "threshold": 4
  }
};

