/*
 * @source: etherscan.io 
 * @author: -
 * @vulnerable_at_lines: 12
 */

pragma solidity ^0.4.14;

contract Caller {
    function callAddress(address a) {
        // <yes> <report> UNCHECKED_LL_CALLS
        a.call();
    }
}