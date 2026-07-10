/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/verity_worldcup.json`.
 */
export type VerityWorldcup = {
  "address": "8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21",
  "metadata": {
    "name": "verityWorldcup",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Verity World Cup parimutuel settlement engine — resolves via CPI into TxLINE validate_stat"
  },
  "instructions": [
    {
      "name": "addLiquidity",
      "docs": [
        "Provide liquidity, split evenly across both sides. The LP's losing half is",
        "forfeited to winners at settlement (directional risk); in return the LP",
        "earns a pro-rata slice of the settlement fee."
      ],
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claim",
      "docs": [
        "Claim winnings (and LP fee share) for the caller's position."
      ],
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "claimCreatorRoyalty",
      "docs": [
        "Creator claims their royalty slice of the fee (once)."
      ],
      "discriminator": [
        163,
        64,
        97,
        116,
        199,
        184,
        152,
        197
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "creatorUsdc",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "claimTreasury",
      "docs": [
        "Keeper/treasury claims the protocol slice of the fee (once)."
      ],
      "discriminator": [
        78,
        107,
        230,
        224,
        191,
        237,
        4,
        163
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "authorityUsdc",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initMarket",
      "docs": [
        "Create a market for one fixture + encoded stat key. The winning condition",
        "is fixed here and cannot be altered later."
      ],
      "discriminator": [
        33,
        253,
        15,
        116,
        89,
        25,
        127,
        236
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "fixtureId"
              },
              {
                "kind": "arg",
                "path": "statKey"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fixtureId",
          "type": "i64"
        },
        {
          "name": "statKey",
          "type": "u32"
        },
        {
          "name": "statPeriod",
          "type": "i32"
        },
        {
          "name": "threshold",
          "type": "i32"
        },
        {
          "name": "comparison",
          "type": "u8"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "creatorFeeShareBps",
          "type": "u16"
        },
        {
          "name": "lpFeeShareBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "settle",
      "docs": [
        "Resolve the market by CPI-ing into TxLINE `validate_stat` with a fresh",
        "proof. Keeper-only. Snapshots the fee split and winning pool."
      ],
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "dailyScoresMerkleRoots"
        },
        {
          "name": "txlineProgram"
        }
      ],
      "args": [
        {
          "name": "ts",
          "type": "i64"
        },
        {
          "name": "fixtureSummary",
          "type": {
            "defined": {
              "name": "scoresBatchSummary"
            }
          }
        },
        {
          "name": "fixtureProof",
          "type": {
            "vec": {
              "defined": {
                "name": "proofNode"
              }
            }
          }
        },
        {
          "name": "mainTreeProof",
          "type": {
            "vec": {
              "defined": {
                "name": "proofNode"
              }
            }
          }
        },
        {
          "name": "statValue",
          "type": "i32"
        },
        {
          "name": "eventStatRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "statProof",
          "type": {
            "vec": {
              "defined": {
                "name": "proofNode"
              }
            }
          }
        }
      ]
    },
    {
      "name": "stake",
      "docs": [
        "Place a directional bet on YES (1) or NO (0)."
      ],
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "marketSettled",
      "discriminator": [
        237,
        212,
        22,
        175,
        201,
        117,
        215,
        99
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketClosed",
      "msg": "Market deadline has already passed; staking is closed"
    },
    {
      "code": 6001,
      "name": "marketNotClosed",
      "msg": "Market deadline has not been reached yet"
    },
    {
      "code": 6002,
      "name": "alreadyResolved",
      "msg": "Market is already resolved"
    },
    {
      "code": 6003,
      "name": "notResolved",
      "msg": "Market is not resolved yet"
    },
    {
      "code": 6004,
      "name": "invalidSide",
      "msg": "Invalid side; expected 0 (NO) or 1 (YES)"
    },
    {
      "code": 6005,
      "name": "invalidComparison",
      "msg": "Invalid comparison operator stored on market"
    },
    {
      "code": 6006,
      "name": "zeroAmount",
      "msg": "Stake or liquidity amount must be greater than zero"
    },
    {
      "code": 6007,
      "name": "invalidFeeConfig",
      "msg": "Fee configuration is invalid (shares exceed the total fee)"
    },
    {
      "code": 6008,
      "name": "invalidTxlineProgram",
      "msg": "Provided TxLINE program account does not match the expected program id"
    },
    {
      "code": 6009,
      "name": "fixtureMismatch",
      "msg": "Fixture id in the proof does not match this market"
    },
    {
      "code": 6010,
      "name": "noReturnData",
      "msg": "TxLINE validate_stat returned no data"
    },
    {
      "code": 6011,
      "name": "alreadyClaimed",
      "msg": "This position has already been claimed"
    },
    {
      "code": 6012,
      "name": "nothingToClaim",
      "msg": "Nothing available to claim for this account"
    },
    {
      "code": 6013,
      "name": "creatorAlreadyClaimed",
      "msg": "Creator royalty already claimed"
    },
    {
      "code": 6014,
      "name": "treasuryAlreadyClaimed",
      "msg": "Treasury fee already claimed"
    },
    {
      "code": 6015,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "market",
      "docs": [
        "One parimutuel prop market, keyed by a TxLINE fixture + encoded stat key.",
        "",
        "The winning condition (`stat_key`/`stat_period`/`threshold`/`comparison`) is",
        "fixed at creation and cannot be changed, so resolution is a pure function of",
        "TxLINE-signed data — the settler only supplies a fresh Merkle proof."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Keeper authorized to call `settle` (backend protocol wallet)."
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "Market creator, entitled to the creator royalty slice of the fee."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "PDA token account holding all staked USDC for this market."
            ],
            "type": "pubkey"
          },
          {
            "name": "fixtureId",
            "docs": [
              "TxLINE fixture id this market resolves against."
            ],
            "type": "i64"
          },
          {
            "name": "statKey",
            "docs": [
              "Encoded TxLINE stat key: `(period * 1000) + base_key`."
            ],
            "type": "u32"
          },
          {
            "name": "statPeriod",
            "docs": [
              "Period component passed to TxLINE's `ScoreStat`."
            ],
            "type": "i32"
          },
          {
            "name": "threshold",
            "docs": [
              "Threshold the observed stat is compared against."
            ],
            "type": "i32"
          },
          {
            "name": "comparison",
            "docs": [
              "0 = GreaterThan, 1 = LessThan, 2 = EqualTo."
            ],
            "type": "u8"
          },
          {
            "name": "deadline",
            "docs": [
              "Unix ts after which staking closes and settlement is allowed."
            ],
            "type": "i64"
          },
          {
            "name": "feeBps",
            "docs": [
              "Total protocol fee taken from the pot at settlement (basis points)."
            ],
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "docs": [
              "Portion of the fee routed to the creator (basis points of the fee)."
            ],
            "type": "u16"
          },
          {
            "name": "lpFeeShareBps",
            "docs": [
              "Portion of the fee routed to LPs (basis points of the fee)."
            ],
            "type": "u16"
          },
          {
            "name": "yesPool",
            "docs": [
              "Total USDC staked on YES (bettor stakes + LP yes halves)."
            ],
            "type": "u64"
          },
          {
            "name": "noPool",
            "docs": [
              "Total USDC staked on NO (bettor stakes + LP no halves)."
            ],
            "type": "u64"
          },
          {
            "name": "totalLpDeposits",
            "docs": [
              "Total LP principal (used to weight the LP fee slice)."
            ],
            "type": "u64"
          },
          {
            "name": "resolved",
            "type": "bool"
          },
          {
            "name": "voided",
            "docs": [
              "Set when the winning side had zero stake — everyone is refunded."
            ],
            "type": "bool"
          },
          {
            "name": "winningSide",
            "docs": [
              "0 = NO won, 1 = YES won (valid only once `resolved`)."
            ],
            "type": "u8"
          },
          {
            "name": "winningPool",
            "type": "u64"
          },
          {
            "name": "distributable",
            "type": "u64"
          },
          {
            "name": "creatorFee",
            "type": "u64"
          },
          {
            "name": "lpFee",
            "type": "u64"
          },
          {
            "name": "treasuryFee",
            "type": "u64"
          },
          {
            "name": "creatorClaimed",
            "type": "bool"
          },
          {
            "name": "treasuryClaimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "winningSide",
            "type": "u8"
          },
          {
            "name": "voided",
            "type": "bool"
          },
          {
            "name": "distributable",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "position",
      "docs": [
        "A single account's stake in a market. LPs and bettors share this account:",
        "LP deposits are split evenly into `yes_stake`/`no_stake` and additionally",
        "recorded in `lp_deposit` for fee-share weighting."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "yesStake",
            "type": "u64"
          },
          {
            "name": "noStake",
            "type": "u64"
          },
          {
            "name": "lpDeposit",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proofNode",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isRightSibling",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "scoresBatchSummary",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "updateStats",
            "type": {
              "defined": {
                "name": "scoresUpdateStats"
              }
            }
          },
          {
            "name": "eventsSubTreeRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "scoresUpdateStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateCount",
            "type": "i32"
          },
          {
            "name": "minTimestamp",
            "type": "i64"
          },
          {
            "name": "maxTimestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
