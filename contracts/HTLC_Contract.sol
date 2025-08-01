// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AtomicSwap {
    enum State { INVALID, OPEN, CLAIMED, REFUNDED }

    struct Swap {
        address sender;
        address recipient;
        address token; // address(0) for native ETH/TRX
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bytes32 preimage;
        State state;
    }

    mapping(bytes32 => Swap) public swaps; // key: hashlock

    event HTLCLocked(
        bytes32 indexed hashlock,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 timelock
    );

    event HTLCClaimed(
        bytes32 indexed hashlock,
        bytes32 preimage
    );

    event HTLCRefunded(
        bytes32 indexed hashlock
    );

    modifier onlyOpen(bytes32 _hashlock) {
        require(swaps[_hashlock].state == State.OPEN, "Not open");
        _;
    }

    function lock(
        bytes32 _hashlock,
        address _recipient,
        address _token,
        uint256 _amount,
        uint256 _timelock
    ) external payable {
        require(swaps[_hashlock].state == State.INVALID, "Already exists");
        require(_timelock > block.timestamp, "Timelock too soon");

        if (_token == address(0)) {
            require(msg.value == _amount, "ETH mismatch");
        } else {
            require(msg.value == 0, "No ETH for token swap");
            IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        }

        swaps[_hashlock] = Swap({
            sender: msg.sender,
            recipient: _recipient,
            token: _token,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            preimage: bytes32(0),
            state: State.OPEN
        });

        emit HTLCLocked(_hashlock, msg.sender, _recipient, _token, _amount, _timelock);
    }

    function claim(bytes32 _preimage) external {
        // SIMPLE: Direct hash that matches backend's ethers.keccak256(secret)
        bytes32 hashlock = keccak256(abi.encodePacked(_preimage));
        
        Swap storage s = swaps[hashlock];
        require(s.state == State.OPEN, "Not open");
        require(block.timestamp < s.timelock, "Expired");
        require(msg.sender == s.recipient, "Not recipient");

        s.state = State.CLAIMED;
        s.preimage = _preimage;

        if (s.token == address(0)) {
            payable(s.recipient).transfer(s.amount);
        } else {
            IERC20(s.token).transfer(s.recipient, s.amount);
        }

        emit HTLCClaimed(hashlock, _preimage);
    }

    function refund(bytes32 _hashlock) external onlyOpen(_hashlock) {
        Swap storage s = swaps[_hashlock];
        require(block.timestamp >= s.timelock, "Too early");
        require(msg.sender == s.sender, "Not sender");

        s.state = State.REFUNDED;

        if (s.token == address(0)) {
            payable(s.sender).transfer(s.amount);
        } else {
            IERC20(s.token).transfer(s.sender, s.amount);
        }

        emit HTLCRefunded(_hashlock);
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}