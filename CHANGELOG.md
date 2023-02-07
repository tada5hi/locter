## [1.0.1](https://github.com/tada5hi/locter/compare/v1.0.0...v1.0.1) (2023-02-07)


### Bug Fixes

* change return type of load and loadSync ([1613372](https://github.com/tada5hi/locter/commit/1613372e1931ba5d9a5bde124feb5827e794a5d7))

# [1.0.0](https://github.com/tada5hi/locter/compare/v0.8.2...v1.0.0) (2023-02-07)


### Features

* refactored code base and public api ([a864805](https://github.com/tada5hi/locter/commit/a864805d031118d5d7beaad5fd9713bf0d96f097))


### BREAKING CHANGES

* public api changed

## [0.8.2](https://github.com/tada5hi/locter/compare/v0.8.1...v0.8.2) (2023-01-31)


### Bug Fixes

* compatibility issues with ts-node ([da3db7f](https://github.com/tada5hi/locter/commit/da3db7f231918525ccbf5e70aa083f02fb8ba48e))

## [0.8.1](https://github.com/tada5hi/locter/compare/v0.8.0...v0.8.1) (2023-01-31)


### Bug Fixes

* fallback to require for jest env, due segmentation fault ([c514882](https://github.com/tada5hi/locter/commit/c51488216591ef8e07cfd056ecc2f95b6e14d35d))

# [0.8.0](https://github.com/tada5hi/locter/compare/v0.7.1...v0.8.0) (2023-01-30)


### Bug Fixes

* added missing loader exports ([7bcc6fb](https://github.com/tada5hi/locter/commit/7bcc6fb23074bb5fb4f3f0fd65e174519882d1a8))
* **deps:** bump dependencies ([cf93b11](https://github.com/tada5hi/locter/commit/cf93b11da042707d0d73b80b293acd1ab4c38657))


### Features

* enable just in time compilation/transpiling for esm & ts files ([732bb4b](https://github.com/tada5hi/locter/commit/732bb4baa802e8d22d3261baccb42f8ebf934bdd))

## [0.7.1](https://github.com/tada5hi/locter/compare/v0.7.0...v0.7.1) (2023-01-17)


### Bug Fixes

* **deps:** bump glob from 8.0.3 to 8.1.0 ([403b309](https://github.com/tada5hi/locter/commit/403b30913dc6abc080f021f3234f7a48debc4cb4))

# [0.7.0](https://github.com/tada5hi/locter/compare/v0.6.2...v0.7.0) (2023-01-14)


### Features

* stricter file loader + enhanced cjs/esm build ([85b7e70](https://github.com/tada5hi/locter/commit/85b7e70c2c30af4418dacf64d1fc4e32c8ad3e8e))

## [0.6.2](https://github.com/tada5hi/locter/compare/v0.6.1...v0.6.2) (2023-01-07)


### Bug Fixes

* **deps:** bump json5 from 1.0.1 to 1.0.2 ([118696d](https://github.com/tada5hi/locter/commit/118696d308fd4a04dfe0ba1a8ec7290ad8497dfa))

## [0.6.1](https://github.com/tada5hi/locter/compare/v0.6.0...v0.6.1) (2022-12-19)


### Bug Fixes

* transpile dynamic imports for cjs to require ([5a62235](https://github.com/tada5hi/locter/commit/5a62235c0b3dba59e773154f7f352edeef8e2807))

# [0.6.0](https://github.com/tada5hi/locter/compare/v0.5.3...v0.6.0) (2022-12-01)


### Features

* accept multiple inputs for loading json ([7a81c7a](https://github.com/tada5hi/locter/commit/7a81c7a6af6f08f1dd77ea83f32365436425dbaa))
* better error handling for script loading ([8f18261](https://github.com/tada5hi/locter/commit/8f182613ea67e01725f19ecc45b32d0dfed093d2))

## [0.5.3](https://github.com/tada5hi/locter/compare/v0.5.2...v0.5.3) (2022-11-30)


### Bug Fixes

* guarantee that option is not already set on load error ([b1736dd](https://github.com/tada5hi/locter/commit/b1736dd00211f1c85351f384f3df3195a3abeb01))

## [0.5.2](https://github.com/tada5hi/locter/compare/v0.5.1...v0.5.2) (2022-11-29)


### Bug Fixes

* sync script loading with fallback for appending extension ([b988e0f](https://github.com/tada5hi/locter/commit/b988e0ff8e55d501f0c08a89616116d3706d8053))

## [0.5.1](https://github.com/tada5hi/locter/compare/v0.5.0...v0.5.1) (2022-11-29)


### Bug Fixes

* enhance async script loader ([f6091fa](https://github.com/tada5hi/locter/commit/f6091fa9a1c4882c66af751585ef19ae4d79bfc4))

# [0.5.0](https://github.com/tada5hi/locter/compare/v0.4.0...v0.5.0) (2022-11-29)


### Features

* enhance loader api + fix esm build ([253ea59](https://github.com/tada5hi/locter/commit/253ea59d7461dc2c8dd24e78f63be08a0bafaad2))

# [0.4.0](https://github.com/tada5hi/locter/compare/v0.3.2...v0.4.0) (2022-11-28)


### Features

* added esm modules support ([e201769](https://github.com/tada5hi/locter/commit/e2017690b4487f7821dacc0874b6fcc58ca518e7))

## [0.3.2](https://github.com/tada5hi/locter/compare/v0.3.1...v0.3.2) (2022-10-11)


### Bug Fixes

* export utils directory ([8dde358](https://github.com/tada5hi/locter/commit/8dde358192e47176674f34f435006b757f920380))

## [0.3.1](https://github.com/tada5hi/locter/compare/v0.3.0...v0.3.1) (2022-10-03)


### Bug Fixes

* add missing util function export ([7ee7de0](https://github.com/tada5hi/locter/commit/7ee7de093e9fd1f933091912045415fa88ffdd44))

# [0.3.0](https://github.com/tada5hi/locter/compare/v0.2.2...v0.3.0) (2022-10-03)


### Features

* add file-name extension helper ([ce1095f](https://github.com/tada5hi/locter/commit/ce1095f3dd4e6b19358bf59a6d9d3a56033505da))
